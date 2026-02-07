// Constants
const MILEAGE_RATE = 0.545; // IRS rate per mile
const AUTO_SAVE_DELAY = 2000; // Auto-save after 2 seconds of inactivity

// Auto-save state
let autoSaveTimeout = null;
let isAutoSaving = false;

// Service Types Dropdown Options
const SERVICE_TYPES = [
    '',
    'Travel-PT',
    'Travel-PT-Kids',
    'Travel-FS-IH',
    'Travel-FS-OH',
    'Travel-DT',
    'FS.IH',
    'FS.IH.Virtual',
    'FS.IH.Prep',
    'FS.OH',
    'PT',
    'PT.Virtual',
    'PT.Prep',
    'PT.health',
    'Child.Supervision',
    'DT.Urine',
    'DT.Swab',
    'DT.Hair',
    'DT.Sweat',
    'DT.Lab.Confirm',
    'DT.Refusal',
    'DT.Admission',
    'DT.NoShow',
    'DT.Other'
];

// Default Staff Names (used if none saved in localStorage)
const DEFAULT_STAFF_NAMES = [
    'Brandon Hinrichs',
    'Raquel Dean',
    'Crystal Kucklish',
    'Amanda Schopfler',
    'Tawny Gebhard'
];

// Default Clients with Case Numbers (used if none saved in localStorage)
const DEFAULT_CLIENTS = {
    'Caroon, Andrea': '554231',
    'Daleness, Jamie': '314228',
    'Devor, Christina': '190820',
    'Ellis, Kyana': '752481',
    'Jurgens, Tracy': '966999',
    'Lacey, Aaron': '610174',
    'Mukoma, Kazadi': '489172',
    'Musungay, Faida': '489172',
    'Pallas, Ryan': '671791',
    'Schellhorn, Teran': '507906',
    'Shupe, Austi': '671791',
    'Slater, Emeri': '33867',
    'Spencer, Sidney': '745750',
    'Taylor, Hazey': '631992',
    'Todd, Valarie': '144062',
    'Waters, Pamela': '144062',
    'Wigmore, Elizabeth': '33867',
    'Wilson, Amber': '466399'
};

// Load staff and clients from localStorage (or use defaults)
function getStaffNames() {
    const saved = localStorage.getItem('staff_names');
    if (saved) {
        return ['', ...JSON.parse(saved)];
    }
    return ['', ...DEFAULT_STAFF_NAMES];
}

function getClients() {
    const saved = localStorage.getItem('clients');
    let clients = saved ? JSON.parse(saved) : { ...DEFAULT_CLIENTS };

    // Sort clients alphabetically
    const sortedKeys = Object.keys(clients).sort((a, b) => a.localeCompare(b));
    const sorted = {};
    sortedKeys.forEach(key => {
        sorted[key] = clients[key];
    });

    return { '': '', ...sorted };
}

// Dynamic getters for current data
let STAFF_NAMES = getStaffNames();
let CLIENTS = getClients();

// Paid Leave Types
const PAID_LEAVE_TYPES = ['', 'V', 'S', 'H'];

// Global row counter
let rowCounter = 0;

// Google Maps API Key
let GOOGLE_MAPS_API_KEY = 'AIzaSyDHuKbelQ7u7Ukb5BvfGnx_-5dvz1xM1w4';

// ========================================
// DASHBOARD & MANIFEST MANAGEMENT
// ========================================

// Global variable for current timesheet ID
let currentTimesheetId = null;

// Generate UUID v4
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get current ISO timestamp
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Get or create manifest
function getManifest() {
    const manifestJson = localStorage.getItem('timesheet_manifest');
    if (manifestJson) {
        return JSON.parse(manifestJson);
    }
    return {
        timesheets: {},
        lastUpdated: getCurrentTimestamp(),
        version: 1
    };
}

// Save manifest
function saveManifest(manifest) {
    manifest.lastUpdated = getCurrentTimestamp();
    localStorage.setItem('timesheet_manifest', JSON.stringify(manifest));
}

// Add or update timesheet in manifest
function updateManifestEntry(timesheetData) {
    const manifest = getManifest();
    manifest.timesheets[timesheetData.id] = {
        id: timesheetData.id,
        employeeName: timesheetData.employeeName,
        supervisorName: timesheetData.supervisorName,
        payPeriod: timesheetData.payPeriod,
        createdAt: timesheetData.createdAt,
        updatedAt: timesheetData.updatedAt,
        status: timesheetData.status,
        syncStatus: timesheetData.syncStatus || 'local-only',
        firebaseId: timesheetData.firebaseId || null,
        totalHours: calculateTotalHoursForManifest(timesheetData),
        totalMileageReimb: calculateTotalMileageForManifest(timesheetData),
        entryCount: timesheetData.rows.length
    };
    saveManifest(manifest);
}

// Remove timesheet from manifest
function removeFromManifest(id) {
    const manifest = getManifest();
    delete manifest.timesheets[id];
    saveManifest(manifest);
}

// Calculate total hours for manifest
function calculateTotalHoursForManifest(timesheetData) {
    let total = 0;
    timesheetData.rows.forEach(row => {
        const dailyTotal = parseFloat(row.dailyTotal || 0);
        if (!isNaN(dailyTotal)) {
            total += dailyTotal;
        }
    });
    return total.toFixed(2);
}

// Calculate total mileage reimbursement for manifest
function calculateTotalMileageForManifest(timesheetData) {
    let total = 0;
    timesheetData.rows.forEach(row => {
        const reimbStr = row.mileageReimb || '$0.00';
        const reimbValue = parseFloat(reimbStr.replace('$', ''));
        if (!isNaN(reimbValue)) {
            total += reimbValue;
        }
    });
    return total.toFixed(2);
}

// ========================================
// ADDRESS MANAGEMENT UTILITIES
// ========================================

// Get saved addresses
function getSavedAddresses() {
    const addressesJson = localStorage.getItem('saved_addresses');
    if (addressesJson) {
        return JSON.parse(addressesJson);
    }
    return [];
}

// Save addresses
function saveAddresses(addresses) {
    localStorage.setItem('saved_addresses', JSON.stringify(addresses));
}

// Add or update address
function saveAddress(addressString, placeData = null, clientName = null) {
    const addresses = getSavedAddresses();

    // Check if address already exists
    const existingIndex = addresses.findIndex(addr => addr.address === addressString);

    if (existingIndex >= 0) {
        // Update existing address
        addresses[existingIndex].usageCount = (addresses[existingIndex].usageCount || 0) + 1;
        addresses[existingIndex].lastUsed = getCurrentTimestamp();
        // Associate client if provided
        if (clientName) {
            if (!addresses[existingIndex].clients) {
                addresses[existingIndex].clients = [];
            }
            if (!addresses[existingIndex].clients.includes(clientName)) {
                addresses[existingIndex].clients.push(clientName);
            }
        }
    } else {
        // Add new address
        const newAddress = {
            id: generateUUID(),
            address: addressString,
            lat: placeData?.lat || null,
            lng: placeData?.lng || null,
            placeId: placeData?.placeId || null,
            usageCount: 1,
            lastUsed: getCurrentTimestamp(),
            createdAt: getCurrentTimestamp(),
            clients: clientName ? [clientName] : []
        };
        addresses.push(newAddress);
    }

    saveAddresses(addresses);
}

// Delete address
function deleteAddress(id) {
    const addresses = getSavedAddresses();
    const filtered = addresses.filter(addr => addr.id !== id);
    saveAddresses(filtered);
}

// Get addresses sorted by usage
function getAddressesSorted() {
    const addresses = getSavedAddresses();
    // Sort by usage count (descending) then by last used (most recent first)
    return addresses.sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
        }
        return new Date(b.lastUsed) - new Date(a.lastUsed);
    });
}

// ========================================
// TRAVEL COMMENTS MANAGEMENT
// ========================================

// Get saved travel comments
function getSavedTravelComments() {
    const commentsJson = localStorage.getItem('saved_travel_comments');
    if (commentsJson) {
        return JSON.parse(commentsJson);
    }
    return [];
}

// Save travel comments
function saveTravelComments(comments) {
    localStorage.setItem('saved_travel_comments', JSON.stringify(comments));
}

// Add or update travel comment
function saveTravelComment(commentText) {
    if (!commentText || commentText.trim() === '') return;

    const comments = getSavedTravelComments();
    const trimmedComment = commentText.trim();

    // Check if comment already exists
    const existingIndex = comments.findIndex(c => c.text === trimmedComment);

    if (existingIndex >= 0) {
        // Update existing comment
        comments[existingIndex].usageCount = (comments[existingIndex].usageCount || 0) + 1;
        comments[existingIndex].lastUsed = getCurrentTimestamp();
    } else {
        // Add new comment
        const newComment = {
            id: generateUUID(),
            text: trimmedComment,
            usageCount: 1,
            lastUsed: getCurrentTimestamp(),
            createdAt: getCurrentTimestamp()
        };
        comments.push(newComment);
    }

    saveTravelComments(comments);
}

// Get travel comments sorted by usage
function getTravelCommentsSorted() {
    const comments = getSavedTravelComments();
    return comments.sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
        }
        return new Date(b.lastUsed) - new Date(a.lastUsed);
    });
}

// Populate travel comments datalist
function populateTravelCommentsDatalist() {
    const comments = getTravelCommentsSorted();
    const datalist = document.getElementById('travelCommentsList');

    if (datalist) {
        datalist.innerHTML = comments.map(comment =>
            `<option value="${comment.text}">`
        ).join('');
    }
}

// Save travel comment when user types (on blur)
function saveTravelCommentOnBlur(inputElement) {
    const comment = inputElement.value.trim();
    if (comment) {
        saveTravelComment(comment);
        populateTravelCommentsDatalist();
    }
}

// Migrate existing localStorage timesheets to new format
function migrateExistingTimesheets() {
    const manifest = getManifest();
    let migratedCount = 0;

    // Find all timesheet_* keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('timesheet_') && key !== 'timesheet_manifest') {
            try {
                const data = JSON.parse(localStorage.getItem(key));

                // Check if already migrated (has id field)
                if (!data.id) {
                    // Add new fields
                    data.id = generateUUID();
                    data.createdAt = getCurrentTimestamp();
                    data.updatedAt = getCurrentTimestamp();
                    data.status = 'draft';
                    data.syncStatus = 'local-only';
                    data.version = 1;

                    // Save with new structure
                    localStorage.setItem(`timesheet_${data.id}`, JSON.stringify(data));
                    updateManifestEntry(data);

                    // Remove old key if different
                    if (key !== `timesheet_${data.id}`) {
                        localStorage.removeItem(key);
                    }

                    migratedCount++;
                }
            } catch (e) {
                console.error('Error migrating timesheet:', key, e);
            }
        }
    }

    if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} timesheets to new format`);
    }
}

// ========================================
// GOOGLE PLACES AUTOCOMPLETE
// ========================================

// Initialize autocomplete on an address input field
function initializeAddressAutocomplete(inputElement, rowIndex) {
    if (!google || !google.maps || !google.maps.places) {
        console.error('Google Places API not loaded');
        return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        types: ['address'],
        componentRestrictions: { country: 'us' } // Restrict to US addresses
    });

    // When a place is selected
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();

        if (place.geometry) {
            const address = place.formatted_address || inputElement.value;
            const placeData = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                placeId: place.place_id
            };

            // Save the address with client context
            const clientName = getValue(`clientName-${rowIndex}`) || null;
            saveAddress(address, placeData, clientName);

            // Update the input value
            inputElement.value = address;

            // Trigger distance calculation if both fields are filled
            calculateDistanceForRow(rowIndex);
        }
    });

    return autocomplete;
}

// Initialize autocomplete for all existing rows
function initializeAllAddressAutocompletes() {
    const tbody = document.getElementById('timesheetBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowIndex = row.dataset.rowIndex;
        const driveFromInput = document.getElementById(`driveFrom-${rowIndex}`);
        const driveToInput = document.getElementById(`driveTo-${rowIndex}`);

        if (driveFromInput && !driveFromInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveFromInput, rowIndex);
            driveFromInput.dataset.autocompleteInitialized = 'true';
        }

        if (driveToInput && !driveToInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveToInput, rowIndex);
            driveToInput.dataset.autocompleteInitialized = 'true';
        }
    });
}

// Populate address datalist for autocomplete dropdown
function populateAddressDatalist(clientName = null) {
    const addresses = getAddressesSorted();
    const datalist = document.getElementById('addressList');

    if (datalist) {
        let filtered = addresses;
        if (clientName) {
            // Show only addresses associated with this client
            const clientAddresses = addresses.filter(addr =>
                addr.clients && addr.clients.includes(clientName)
            );
            // Fall back to all addresses if no client-specific ones exist yet
            if (clientAddresses.length > 0) {
                filtered = clientAddresses;
            }
        }
        datalist.innerHTML = filtered.map(addr =>
            `<option value="${addr.address}">`
        ).join('');
    }
}

// Filter address datalist when a drive from/to input gets focus
function filterAddressesForRow(inputElement) {
    const match = inputElement.id.match(/\d+$/);
    const rowIndex = match ? match[0] : null;
    const clientName = rowIndex ? getValue(`clientName-${rowIndex}`) : null;
    populateAddressDatalist(clientName || null);
}

// Save address when user manually types (on blur)
function saveAddressOnBlur(inputElement) {
    const address = inputElement.value.trim();
    if (address) {
        // Extract row index from input ID (e.g., "driveFrom-5" → 5)
        const match = inputElement.id.match(/\d+$/);
        const rowIndex = match ? match[0] : null;
        const clientName = rowIndex ? getValue(`clientName-${rowIndex}`) : null;
        saveAddress(address, null, clientName || null);
        populateAddressDatalist(); // Refresh the dropdown
    }
}

// Toggle address manager panel
function toggleAddressManager() {
    const panel = document.getElementById('addressManagerPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        renderAddressManager();
    } else {
        panel.style.display = 'none';
    }
}

// Add manual address from input
function addManualAddress() {
    const input = document.getElementById('manualAddressInput');
    const address = input.value.trim();

    if (!address) {
        alert('Please enter an address');
        return;
    }

    saveAddress(address);
    input.value = '';
    populateAddressDatalist();
    renderAddressManager();
}

// Render address manager list
function renderAddressManager() {
    const container = document.getElementById('addressListContainer');
    const addresses = getAddressesSorted();

    if (addresses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved addresses yet.</p>
                <p>Addresses will be automatically saved when you enter them in the timesheet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = addresses.map(addr => {
        const clients = addr.clients && addr.clients.length > 0
            ? addr.clients.join(' | ')
            : 'General (all clients)';
        return `
        <div class="address-item">
            <div class="address-item-content">
                <div class="address-text">${addr.address}</div>
                <div class="address-meta">
                    Used ${addr.usageCount} ${addr.usageCount === 1 ? 'time' : 'times'}
                    • Last used: ${new Date(addr.lastUsed).toLocaleDateString()}
                </div>
                <div class="address-clients">Clients: ${clients}</div>
            </div>
            <button onclick="deleteAddressFromManager('${addr.id}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
    `}).join('');
}

// Delete address from manager
function deleteAddressFromManager(id) {
    if (confirm('Are you sure you want to delete this address?')) {
        deleteAddress(id);
        populateAddressDatalist();
        renderAddressManager();
    }
}

// ========================================
// STAFF MANAGER FUNCTIONS
// ========================================

function toggleStaffManager() {
    const panel = document.getElementById('staffManagerPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        renderStaffManager();
    } else {
        panel.style.display = 'none';
    }
}

function addStaffMember() {
    const input = document.getElementById('newStaffName');
    const name = input.value.trim();

    if (!name) {
        alert('Please enter a staff name');
        return;
    }

    // Get current staff (without empty string)
    const currentStaff = STAFF_NAMES.filter(s => s !== '');

    if (currentStaff.includes(name)) {
        alert('This staff member already exists');
        return;
    }

    currentStaff.push(name);
    currentStaff.sort();

    // Save to localStorage
    localStorage.setItem('staff_names', JSON.stringify(currentStaff));

    // Update global variable
    STAFF_NAMES = ['', ...currentStaff];

    input.value = '';
    renderStaffManager();
    alert(`${name} has been added to the staff list`);
}

function deleteStaffMember(name) {
    if (confirm(`Are you sure you want to remove ${name} from the staff list?`)) {
        const currentStaff = STAFF_NAMES.filter(s => s !== '' && s !== name);

        // Save to localStorage
        localStorage.setItem('staff_names', JSON.stringify(currentStaff));

        // Update global variable
        STAFF_NAMES = ['', ...currentStaff];

        renderStaffManager();
    }
}

function renderStaffManager() {
    const container = document.getElementById('staffListContainer');
    const staffList = STAFF_NAMES.filter(s => s !== '');

    if (staffList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No staff members added yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = staffList.map(name => `
        <div class="settings-item">
            <div class="settings-item-info">
                <span class="settings-item-name">${name}</span>
            </div>
            <button onclick="deleteStaffMember('${name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-delete">Delete</button>
        </div>
    `).join('');
}

// ========================================
// CLIENT MANAGER FUNCTIONS
// ========================================

function toggleClientManager() {
    const panel = document.getElementById('clientManagerPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        renderClientManager();
    } else {
        panel.style.display = 'none';
    }
}

function addClient() {
    const nameInput = document.getElementById('newClientName');
    const caseInput = document.getElementById('newClientCaseNumber');
    const name = nameInput.value.trim();
    const caseNumber = caseInput.value.trim();

    if (!name) {
        alert('Please enter a client name');
        return;
    }

    if (!caseNumber) {
        alert('Please enter a master case number');
        return;
    }

    // Get current clients (without empty string key)
    const currentClients = { ...CLIENTS };
    delete currentClients[''];

    if (currentClients[name]) {
        alert('This client already exists');
        return;
    }

    currentClients[name] = caseNumber;

    // Sort clients alphabetically and save
    const sortedClients = sortClientsAlphabetically(currentClients);

    // Save to localStorage
    localStorage.setItem('clients', JSON.stringify(sortedClients));

    // Update global variable
    CLIENTS = { '': '', ...sortedClients };

    nameInput.value = '';
    caseInput.value = '';
    renderClientManager();
    alert(`${name} has been added to the client list`);
}

// Helper function to sort clients alphabetically
function sortClientsAlphabetically(clients) {
    const sortedKeys = Object.keys(clients).sort((a, b) => a.localeCompare(b));
    const sorted = {};
    sortedKeys.forEach(key => {
        sorted[key] = clients[key];
    });
    return sorted;
}

function deleteClient(name) {
    if (confirm(`Are you sure you want to remove ${name} from the client list?`)) {
        const currentClients = { ...CLIENTS };
        delete currentClients[''];
        delete currentClients[name];

        // Save to localStorage
        localStorage.setItem('clients', JSON.stringify(currentClients));

        // Update global variable
        CLIENTS = { '': '', ...currentClients };

        renderClientManager();
    }
}

function renderClientManager() {
    const container = document.getElementById('clientListContainer');
    const clientList = Object.entries(CLIENTS).filter(([name]) => name !== '');

    if (clientList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No clients added yet.</p>
            </div>
        `;
        return;
    }

    // Sort by name
    clientList.sort((a, b) => a[0].localeCompare(b[0]));

    container.innerHTML = clientList.map(([name, caseNumber]) => `
        <div class="settings-item">
            <div class="settings-item-info">
                <span class="settings-item-name">${name}</span>
                <span class="settings-item-detail">Case #: ${caseNumber}</span>
            </div>
            <button onclick="deleteClient('${name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-delete">Delete</button>
        </div>
    `).join('');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Migrate existing timesheets if needed
    migrateExistingTimesheets();

    // Show dashboard by default
    showDashboard();

    // Add search listener with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => renderDashboard(), 300);
    });

    // Add filter listeners
    document.getElementById('statusFilter').addEventListener('change', renderDashboard);
    document.getElementById('employeeFilter').addEventListener('change', renderDashboard);

    // Load Google Maps API key from localStorage if exists (allows override)
    const savedKey = localStorage.getItem('googleMapsApiKey');
    if (savedKey) {
        GOOGLE_MAPS_API_KEY = savedKey;
    }

    // Add initial rows for timesheet editor (will be hidden initially)
    for (let i = 0; i < 10; i++) {
        addNewRow();
    }

    // Initialize address autocomplete and datalist
    setTimeout(() => {
        initializeAllAddressAutocompletes();
        populateAddressDatalist();

        // Attach auto-save listeners after everything is loaded
        attachAutoSaveListeners();
    }, 500); // Delay to ensure Google Maps API is loaded
});

// Prompt for Google Maps API Key
function promptForGoogleMapsKey() {
    const key = prompt('Enter your Google Maps API Key (optional, for automatic distance calculation):');
    if (key) {
        GOOGLE_MAPS_API_KEY = key;
        localStorage.setItem('googleMapsApiKey', key);
    }
}

// Add new row to the timesheet
function addNewRow() {
    const tbody = document.getElementById('timesheetBody');
    const row = tbody.insertRow();
    row.id = `row-${rowCounter}`;
    row.dataset.rowIndex = rowCounter;

    // Column A: Service Type (dropdown)
    const cellServiceType = row.insertCell();
    cellServiceType.innerHTML = createDropdown('serviceType', SERVICE_TYPES, rowCounter);

    // Column B: Service Choice
    const cellServiceChoice = row.insertCell();
    cellServiceChoice.innerHTML = `<input type="text" id="serviceChoice-${rowCounter}" data-col="serviceChoice">`;

    // Column C: Travel Comments
    const cellTravelComments = row.insertCell();
    cellTravelComments.innerHTML = `<textarea id="travelComments-${rowCounter}" data-col="travelComments"></textarea>`;

    // Column D: Client Name
    const cellClientName = row.insertCell();
    cellClientName.innerHTML = createClientDropdown('clientName', rowCounter);

    // Column E: Master Case # (auto-populated)
    const cellCaseNumber = row.insertCell();
    cellCaseNumber.className = 'calc-cell';
    cellCaseNumber.innerHTML = `<input type="text" id="caseNumber-${rowCounter}" data-col="caseNumber" readonly>`;

    // Column F: Date
    const cellDate = row.insertCell();
    cellDate.innerHTML = `<input type="date" id="date-${rowCounter}" data-col="date">`;

    // Column G: Time In
    const cellTimeIn = row.insertCell();
    cellTimeIn.innerHTML = `<input type="time" id="timeIn-${rowCounter}" data-col="timeIn" onchange="calculateRow(${rowCounter})">`;

    // Column H: Time Out
    const cellTimeOut = row.insertCell();
    cellTimeOut.innerHTML = `<input type="time" id="timeOut-${rowCounter}" data-col="timeOut" onchange="calculateRow(${rowCounter})">`;

    // Column I: Drive From Address
    const cellDriveFrom = row.insertCell();
    cellDriveFrom.innerHTML = `<input type="text" id="driveFrom-${rowCounter}" data-col="driveFrom" list="addressList" placeholder="From Address" onfocus="filterAddressesForRow(this)" onblur="saveAddressOnBlur(this); calculateDistance(${rowCounter})">`;

    // Column J: Drive To Address
    const cellDriveTo = row.insertCell();
    cellDriveTo.innerHTML = `<input type="text" id="driveTo-${rowCounter}" data-col="driveTo" list="addressList" placeholder="To Address" onfocus="filterAddressesForRow(this)" onblur="saveAddressOnBlur(this); calculateDistance(${rowCounter})">`;

    // Column K: Miles (calculated)
    const cellMiles = row.insertCell();
    cellMiles.className = 'calc-cell miles-col';
    cellMiles.innerHTML = `<input type="number" id="miles-${rowCounter}" data-col="miles" step="1" readonly>`;

    // Column L: Staff Name
    const cellStaffName = row.insertCell();
    cellStaffName.innerHTML = createDropdown('staffName', STAFF_NAMES, rowCounter);

    // Column M: Transport Bill Time (calculated)
    const cellTransportBillTime = row.insertCell();
    cellTransportBillTime.className = 'calc-cell';
    cellTransportBillTime.innerHTML = `<input type="number" id="transportBillTime-${rowCounter}" data-col="transportBillTime" step="0.01" readonly>`;

    // Column N: Total Mileage (calculated)
    const cellTotalMileage = row.insertCell();
    cellTotalMileage.className = 'calc-cell';
    cellTotalMileage.innerHTML = `<input type="number" id="totalMileage-${rowCounter}" data-col="totalMileage" step="0.1" readonly>`;

    // Column O: Billable Hours (calculated)
    const cellBillableHours = row.insertCell();
    cellBillableHours.className = 'calc-cell billable-col';
    cellBillableHours.innerHTML = `<input type="number" id="billableHours-${rowCounter}" data-col="billableHours" step="0.01" readonly>`;

    // Column P: IndHrs - Drive Non-Bill (calculated)
    const cellIndHrsDriveNonBill = row.insertCell();
    cellIndHrsDriveNonBill.className = 'calc-cell';
    cellIndHrsDriveNonBill.innerHTML = `<input type="number" id="indHrsDriveNonBill-${rowCounter}" data-col="indHrsDriveNonBill" step="0.25" readonly>`;

    // Column Q: Indirect Hours (calculated)
    const cellIndirectHours = row.insertCell();
    cellIndirectHours.className = 'calc-cell';
    cellIndirectHours.innerHTML = `<input type="number" id="indirectHours-${rowCounter}" data-col="indirectHours" step="0.01" readonly>`;

    // Column R: Drive Total (calculated)
    const cellDriveTotal = row.insertCell();
    cellDriveTotal.className = 'calc-cell';
    cellDriveTotal.innerHTML = `<input type="number" id="driveTotal-${rowCounter}" data-col="driveTotal" step="0.01" readonly>`;

    // Column S: Daily Total (calculated)
    const cellDailyTotal = row.insertCell();
    cellDailyTotal.className = 'calc-cell';
    cellDailyTotal.innerHTML = `<input type="number" id="dailyTotal-${rowCounter}" data-col="dailyTotal" step="0.01" readonly>`;

    // Column T: Mileage Reimbursement (calculated)
    const cellMileageReimb = row.insertCell();
    cellMileageReimb.className = 'calc-cell';
    cellMileageReimb.innerHTML = `<input type="text" id="mileageReimb-${rowCounter}" data-col="mileageReimb" readonly>`;

    // Actions column
    const cellActions = row.insertCell();
    cellActions.innerHTML = `
        <div class="action-cell">
            <button class="btn-insert" onclick="insertRowAfter(${rowCounter})" title="Insert row below">+</button>
            <button class="btn-duplicate" onclick="duplicateRow(${rowCounter})">Copy</button>
            <button class="btn-delete" onclick="deleteRow(${rowCounter})">Delete</button>
        </div>
    `;

    // Initialize autocomplete on the new address fields
    setTimeout(() => {
        const driveFromInput = document.getElementById(`driveFrom-${rowCounter}`);
        const driveToInput = document.getElementById(`driveTo-${rowCounter}`);

        if (driveFromInput && !driveFromInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveFromInput, rowCounter);
            driveFromInput.dataset.autocompleteInitialized = 'true';
        }

        if (driveToInput && !driveToInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveToInput, rowCounter);
            driveToInput.dataset.autocompleteInitialized = 'true';
        }
    }, 100);

    rowCounter++;
}

// Create dropdown HTML
function createDropdown(fieldName, options, rowIndex) {
    let html = `<select id="${fieldName}-${rowIndex}" data-col="${fieldName}" onchange="calculateRow(${rowIndex})">`;
    options.forEach(option => {
        html += `<option value="${option}">${option}</option>`;
    });
    html += '</select>';
    return html;
}

// Create client dropdown with auto-populate case number
function createClientDropdown(fieldName, rowIndex) {
    let html = `<select id="${fieldName}-${rowIndex}" data-col="${fieldName}" onchange="populateCaseNumber(${rowIndex})">`;
    html += '<option value="">Select Client...</option>';
    Object.keys(CLIENTS).forEach(clientName => {
        if (clientName !== '') {
            html += `<option value="${clientName}">${clientName}</option>`;
        }
    });
    html += '</select>';
    return html;
}

// Populate case number when client is selected
function populateCaseNumber(rowIndex) {
    const clientName = getValue(`clientName-${rowIndex}`);
    const caseNumber = CLIENTS[clientName] || '';
    setValue(`caseNumber-${rowIndex}`, caseNumber);
    calculateRow(rowIndex);
}

// Calculate all formulas for a specific row
function calculateRow(rowIndex) {
    const row = document.querySelector(`#row-${rowIndex}`);
    if (!row) return;

    // Get values
    const serviceType = getValue(`serviceType-${rowIndex}`);
    const timeIn = getValue(`timeIn-${rowIndex}`);
    const timeOut = getValue(`timeOut-${rowIndex}`);
    const paidHours = parseFloat(getValue(`paidHours-${rowIndex}`)) || 0;
    const meetingHours = parseFloat(getValue(`meetingHours-${rowIndex}`)) || 0;
    const trainingHours = parseFloat(getValue(`trainingHours-${rowIndex}`)) || 0;
    const driveNonBill = parseFloat(getValue(`driveNonBill-${rowIndex}`)) || 0;
    const docTime = parseFloat(getValue(`docTime-${rowIndex}`)) || 0;
    const mileageAdj = parseFloat(getValue(`mileageAdj-${rowIndex}`)) || 0;
    const odometerStart = parseFloat(getValue(`odometerStart-${rowIndex}`)) || 0;
    const odometerStop = parseFloat(getValue(`odometerStop-${rowIndex}`)) || 0;

    // Calculate Transport Bill Time (Column Q)
    let transportBillTime = 0;
    if (serviceType && (serviceType.includes('Travel')) && timeIn && timeOut) {
        transportBillTime = calculateHoursDifference(timeIn, timeOut);
    }
    setValue(`transportBillTime-${rowIndex}`, transportBillTime.toFixed(2));

    // Calculate Billable Hours (Column X)
    let billableHours = 0;
    if (timeIn && timeOut) {
        billableHours = calculateHoursDifference(timeIn, timeOut);
    }
    setValue(`billableHours-${rowIndex}`, billableHours.toFixed(2));

    // Calculate Total Mileage (Column W)
    let totalMileage = 0;
    if (odometerStop > 0 && odometerStart > 0) {
        totalMileage = odometerStop - odometerStart;
    }
    setValue(`totalMileage-${rowIndex}`, totalMileage.toFixed(1));

    // Calculate IndHrs - Drive Non-Bill (Column Y)
    setValue(`indHrsDriveNonBill-${rowIndex}`, driveNonBill.toFixed(2));

    // Calculate Indirect Hours (Column Z)
    const indirectHours = paidHours + meetingHours + trainingHours + docTime;
    setValue(`indirectHours-${rowIndex}`, indirectHours.toFixed(2));

    // Calculate Drive Total (Column AA)
    const driveTotal = transportBillTime + driveNonBill;
    setValue(`driveTotal-${rowIndex}`, driveTotal.toFixed(2));

    // Calculate Daily Total (Column AB)
    const dailyTotal = paidHours + meetingHours + trainingHours + docTime + billableHours + driveNonBill;
    setValue(`dailyTotal-${rowIndex}`, dailyTotal.toFixed(2));

    // Calculate Mileage Reimbursement (Column AC)
    const mileageReimb = (totalMileage - mileageAdj) * MILEAGE_RATE;
    setValue(`mileageReimb-${rowIndex}`, `$${mileageReimb.toFixed(2)}`);

    // Update totals
    updateTotals();
}

// Calculate hours difference between two times
function calculateHoursDifference(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;

    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);

    let inTotalMinutes = inHours * 60 + inMinutes;
    let outTotalMinutes = outHours * 60 + outMinutes;

    // Handle overnight shift
    if (outTotalMinutes < inTotalMinutes) {
        outTotalMinutes += 24 * 60;
    }

    const diffMinutes = outTotalMinutes - inTotalMinutes;
    return diffMinutes / 60;
}

// Calculate distance using Google Maps API
function calculateDistance(rowIndex) {
    const driveFrom = getValue(`driveFrom-${rowIndex}`);
    const driveTo = getValue(`driveTo-${rowIndex}`);

    if (!driveFrom || !driveTo) {
        setValue(`miles-${rowIndex}`, '');
        return;
    }

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps API not loaded. Distance calculation skipped.');
        return;
    }

    // Use Google Maps Distance Matrix Service
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
        {
            origins: [driveFrom],
            destinations: [driveTo],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.IMPERIAL
        },
        (response, status) => {
            if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                const distanceInMiles = response.rows[0].elements[0].distance.value * 0.000621371;
                setValue(`miles-${rowIndex}`, Math.round(distanceInMiles));
                calculateRow(rowIndex);
            } else {
                console.error('Distance calculation failed:', status, response);
                // Allow manual entry if automatic calculation fails
            }
        }
    );
}

// Helper function to calculate distance for a row (called by autocomplete)
function calculateDistanceForRow(rowIndex) {
    calculateDistance(rowIndex);
}

// Update all totals in the footer
function updateTotals() {
    const tbody = document.getElementById('timesheetBody');
    const rows = tbody.querySelectorAll('tr');

    let totalMiles = 0;
    let totalTransportBillTime = 0;
    let totalMileageTotal = 0;
    let totalBillableHours = 0;
    let totalIndHrsDriveNonBill = 0;
    let totalIndirectHours = 0;
    let totalDriveTotal = 0;
    let totalDailyTotal = 0;
    let totalMileageReimb = 0;

    rows.forEach(row => {
        const rowIndex = row.dataset.rowIndex;
        const serviceType = getValue(`serviceType-${rowIndex}`);
        const timeIn = getValue(`timeIn-${rowIndex}`);
        const timeOut = getValue(`timeOut-${rowIndex}`);

        totalMiles += parseFloat(getValue(`miles-${rowIndex}`)) || 0;
        totalMileageTotal += parseFloat(getValue(`totalMileage-${rowIndex}`)) || 0;
        totalIndHrsDriveNonBill += parseFloat(getValue(`indHrsDriveNonBill-${rowIndex}`)) || 0;
        totalIndirectHours += parseFloat(getValue(`indirectHours-${rowIndex}`)) || 0;
        totalDriveTotal += parseFloat(getValue(`driveTotal-${rowIndex}`)) || 0;
        totalDailyTotal += parseFloat(getValue(`dailyTotal-${rowIndex}`)) || 0;

        const reimbStr = getValue(`mileageReimb-${rowIndex}`);
        totalMileageReimb += parseFloat(reimbStr.replace('$', '')) || 0;

        // Calculate travel hours vs billable hours based on service type
        if (timeIn && timeOut && serviceType && serviceType.trim() !== '') {
            const hours = calculateHoursDifference(timeIn, timeOut);

            if (serviceType.startsWith('Travel-')) {
                // Travel service - add to travel hours (totalTransportBillTime)
                totalTransportBillTime += hours;
            } else {
                // Non-travel service - add to billable hours
                totalBillableHours += hours;
            }
        }
    });

    // Only update totals for fields that still exist in the UI
    document.getElementById('totalMiles').textContent = totalMiles.toFixed(1);
    document.getElementById('totalTransportBillTime').textContent = totalTransportBillTime.toFixed(2);
    document.getElementById('totalMileageTotal').textContent = totalMileageTotal.toFixed(1);
    document.getElementById('totalBillableHours').textContent = totalBillableHours.toFixed(2);
    document.getElementById('totalIndHrsDriveNonBill').textContent = totalIndHrsDriveNonBill.toFixed(2);
    document.getElementById('totalIndirectHours').textContent = totalIndirectHours.toFixed(2);
    document.getElementById('totalDriveTotal').textContent = totalDriveTotal.toFixed(2);
    document.getElementById('totalDailyTotal').textContent = totalDailyTotal.toFixed(2);
    document.getElementById('totalMileageReimb').textContent = `$${totalMileageReimb.toFixed(2)}`;
}

// Helper function to get value from input/select
function getValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

// Helper function to set value to input/select
function setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    }
}

// Update pay period from date selectors
function updatePayPeriod() {
    const startDate = getValue('payPeriodStart');
    const endDate = getValue('payPeriodEnd');

    if (startDate && endDate) {
        // Parse date strings directly to avoid timezone issues
        // Date format from input is YYYY-MM-DD
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

        // Format: "Jan 24 - Jan 31, 2026"
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonthName = monthNames[startMonth - 1]; // Month is 1-indexed in string
        const endMonthName = monthNames[endMonth - 1];
        const year = endYear;

        let formatted;
        if (startMonth === endMonth) {
            // Same month: "Jan 24-31, 2026"
            formatted = `${startMonthName} ${startDay}-${endDay}, ${year}`;
        } else {
            // Different months: "Jan 24 - Feb 7, 2026"
            formatted = `${startMonthName} ${startDay} - ${endMonthName} ${endDay}, ${year}`;
        }

        setValue('payPeriod', formatted);
    }
}

// Delete a row
function deleteRow(rowIndex) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const row = document.querySelector(`#row-${rowIndex}`);
        if (row) {
            row.remove();
            updateTotals();
        }
    }
}

// Duplicate a row
function duplicateRow(rowIndex) {
    const sourceRow = document.querySelector(`#row-${rowIndex}`);
    if (!sourceRow) return;

    // Add new row
    addNewRow();
    const newRowIndex = rowCounter - 1;

    // Copy all values except calculated fields
    const fieldsToCopy = [
        'serviceType', 'serviceChoice', 'travelComments', 'clientName', 'caseNumber',
        'driveFrom', 'driveTo', 'staffName'
    ];

    fieldsToCopy.forEach(field => {
        const sourceValue = getValue(`${field}-${rowIndex}`);
        setValue(`${field}-${newRowIndex}`, sourceValue);
    });

    // Recalculate the new row
    calculateRow(newRowIndex);
}

// Insert a new row after the specified row
function insertRowAfter(rowIndex) {
    const sourceRow = document.querySelector(`#row-${rowIndex}`);
    if (!sourceRow) return;

    const tbody = document.getElementById('timesheetBody');
    const newRowIndex = rowCounter;

    // Create a new row element
    const row = document.createElement('tr');
    row.id = `row-${newRowIndex}`;
    row.dataset.rowIndex = newRowIndex;

    // Build all the cells
    row.innerHTML = `
        <td><select id="serviceType-${newRowIndex}" data-col="serviceType" onchange="calculateRow(${newRowIndex})">
            ${SERVICE_TYPES.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select></td>
        <td><input type="text" id="serviceChoice-${newRowIndex}" data-col="serviceChoice"></td>
        <td><textarea id="travelComments-${newRowIndex}" data-col="travelComments"></textarea></td>
        <td><select id="clientName-${newRowIndex}" data-col="clientName" onchange="populateCaseNumber(${newRowIndex})">
            <option value="">Select Client...</option>
            ${Object.keys(CLIENTS).filter(c => c !== '').map(c => `<option value="${c}">${c}</option>`).join('')}
        </select></td>
        <td class="calc-cell"><input type="text" id="caseNumber-${newRowIndex}" data-col="caseNumber" readonly></td>
        <td><input type="date" id="date-${newRowIndex}" data-col="date"></td>
        <td><input type="time" id="timeIn-${newRowIndex}" data-col="timeIn" onchange="calculateRow(${newRowIndex})"></td>
        <td><input type="time" id="timeOut-${newRowIndex}" data-col="timeOut" onchange="calculateRow(${newRowIndex})"></td>
        <td><input type="text" id="driveFrom-${newRowIndex}" data-col="driveFrom" list="addressList" placeholder="From Address" onfocus="filterAddressesForRow(this)" onblur="saveAddressOnBlur(this); calculateDistance(${newRowIndex})"></td>
        <td><input type="text" id="driveTo-${newRowIndex}" data-col="driveTo" list="addressList" placeholder="To Address" onfocus="filterAddressesForRow(this)" onblur="saveAddressOnBlur(this); calculateDistance(${newRowIndex})"></td>
        <td class="calc-cell miles-col"><input type="number" id="miles-${newRowIndex}" data-col="miles" step="1" readonly></td>
        <td><select id="staffName-${newRowIndex}" data-col="staffName" onchange="calculateRow(${newRowIndex})">
            ${STAFF_NAMES.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select></td>
        <td class="calc-cell"><input type="number" id="transportBillTime-${newRowIndex}" data-col="transportBillTime" step="0.01" readonly></td>
        <td class="calc-cell"><input type="number" id="totalMileage-${newRowIndex}" data-col="totalMileage" step="0.1" readonly></td>
        <td class="calc-cell billable-col"><input type="number" id="billableHours-${newRowIndex}" data-col="billableHours" step="0.01" readonly></td>
        <td class="calc-cell"><input type="number" id="indHrsDriveNonBill-${newRowIndex}" data-col="indHrsDriveNonBill" step="0.25" readonly></td>
        <td class="calc-cell"><input type="number" id="indirectHours-${newRowIndex}" data-col="indirectHours" step="0.01" readonly></td>
        <td class="calc-cell"><input type="number" id="driveTotal-${newRowIndex}" data-col="driveTotal" step="0.01" readonly></td>
        <td class="calc-cell"><input type="number" id="dailyTotal-${newRowIndex}" data-col="dailyTotal" step="0.01" readonly></td>
        <td class="calc-cell"><input type="text" id="mileageReimb-${newRowIndex}" data-col="mileageReimb" readonly></td>
        <td>
            <div class="action-cell">
                <button class="btn-insert" onclick="insertRowAfter(${newRowIndex})" title="Insert row below">+</button>
                <button class="btn-duplicate" onclick="duplicateRow(${newRowIndex})">Copy</button>
                <button class="btn-delete" onclick="deleteRow(${newRowIndex})">Delete</button>
            </div>
        </td>
    `;

    // Insert after the source row
    sourceRow.insertAdjacentElement('afterend', row);

    // Initialize autocomplete on the new address fields
    setTimeout(() => {
        const driveFromInput = document.getElementById(`driveFrom-${newRowIndex}`);
        const driveToInput = document.getElementById(`driveTo-${newRowIndex}`);

        if (driveFromInput && !driveFromInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveFromInput, newRowIndex);
            driveFromInput.dataset.autocompleteInitialized = 'true';
        }

        if (driveToInput && !driveToInput.dataset.autocompleteInitialized) {
            initializeAddressAutocomplete(driveToInput, newRowIndex);
            driveToInput.dataset.autocompleteInitialized = 'true';
        }
    }, 100);

    rowCounter++;
    triggerAutoSave();
}

// Clear all data
function clearAll() {
    if (confirm('Are you sure you want to clear all timesheet data? This will create a new timesheet.')) {
        const tbody = document.getElementById('timesheetBody');
        tbody.innerHTML = '';
        rowCounter = 0;
        currentTimesheetId = null; // Reset to create new timesheet

        // Reset header info
        document.getElementById('employeeName').value = '';
        document.getElementById('supervisorName').value = '';
        document.getElementById('payPeriod').value = '';
        document.getElementById('payPeriodStart').value = '';
        document.getElementById('payPeriodEnd').value = '';
        document.getElementById('employeeSignature').value = '';
        document.getElementById('supervisorSignature').value = '';

        // Add fresh rows
        for (let i = 0; i < 10; i++) {
            addNewRow();
        }

        updateTotals();
    }
}

// Save timesheet to localStorage (or Firebase in future)
function saveTimesheet(silent = false) {
    // Gather timesheet data
    const timesheetData = {
        employeeName: getValue('employeeName'),
        supervisorName: getValue('supervisorName'),
        payPeriod: getValue('payPeriod'),
        payPeriodStart: getValue('payPeriodStart'),
        payPeriodEnd: getValue('payPeriodEnd'),
        employeeSignature: getValue('employeeSignature'),
        supervisorSignature: getValue('supervisorSignature'),
        rows: []
    };

    // Validate required fields
    if (!timesheetData.employeeName) {
        if (!silent) alert('Please enter an employee name before saving.');
        return false;
    }

    if (!timesheetData.payPeriod) {
        if (!silent) alert('Please enter a pay period before saving.');
        return false;
    }

    const tbody = document.getElementById('timesheetBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowIndex = row.dataset.rowIndex;
        const rowData = {
            rowIndex: rowIndex,
            serviceType: getValue(`serviceType-${rowIndex}`),
            serviceChoice: getValue(`serviceChoice-${rowIndex}`),
            travelComments: getValue(`travelComments-${rowIndex}`),
            clientName: getValue(`clientName-${rowIndex}`),
            caseNumber: getValue(`caseNumber-${rowIndex}`),
            date: getValue(`date-${rowIndex}`),
            timeIn: getValue(`timeIn-${rowIndex}`),
            timeOut: getValue(`timeOut-${rowIndex}`),
            driveFrom: getValue(`driveFrom-${rowIndex}`),
            driveTo: getValue(`driveTo-${rowIndex}`),
            miles: getValue(`miles-${rowIndex}`),
            staffName: getValue(`staffName-${rowIndex}`),
            transportBillTime: getValue(`transportBillTime-${rowIndex}`),
            totalMileage: getValue(`totalMileage-${rowIndex}`),
            billableHours: getValue(`billableHours-${rowIndex}`),
            indHrsDriveNonBill: getValue(`indHrsDriveNonBill-${rowIndex}`),
            indirectHours: getValue(`indirectHours-${rowIndex}`),
            driveTotal: getValue(`driveTotal-${rowIndex}`),
            dailyTotal: getValue(`dailyTotal-${rowIndex}`),
            mileageReimb: getValue(`mileageReimb-${rowIndex}`)
        };

        // Only save rows that have at least some data
        const hasData = rowData.serviceType || rowData.clientName || rowData.date ||
                       rowData.timeIn || rowData.timeOut || rowData.driveFrom || rowData.driveTo;

        if (hasData) {
            timesheetData.rows.push(rowData);
        }
    });

    // Add or update metadata
    const now = getCurrentTimestamp();
    if (currentTimesheetId) {
        // Updating existing timesheet
        timesheetData.id = currentTimesheetId;
        timesheetData.updatedAt = now;

        // Load existing to preserve created date
        const existing = localStorage.getItem(`timesheet_${currentTimesheetId}`);
        if (existing) {
            const existingData = JSON.parse(existing);
            timesheetData.createdAt = existingData.createdAt;
            timesheetData.version = (existingData.version || 0) + 1;
            timesheetData.status = existingData.status || 'draft';
        }
    } else {
        // New timesheet
        timesheetData.id = generateUUID();
        timesheetData.createdAt = now;
        timesheetData.updatedAt = now;
        timesheetData.version = 1;
        timesheetData.status = 'draft';
        currentTimesheetId = timesheetData.id;
    }

    timesheetData.syncStatus = 'local-only';

    // Save to localStorage
    const key = `timesheet_${timesheetData.id}`;
    localStorage.setItem(key, JSON.stringify(timesheetData));
    localStorage.setItem('lastSavedTimesheet', key);

    // Update manifest
    updateManifestEntry(timesheetData);

    // Show success message (unless silent auto-save)
    if (!silent) {
        alert(`Timesheet saved successfully for ${timesheetData.employeeName}!`);
    } else {
        updateAutoSaveStatus('saved');
    }

    // TODO: Sync to Firebase in background
    return true;
}

// Auto-save with debouncing
function triggerAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Update status to saving
    updateAutoSaveStatus('saving');

    // Set new timeout
    autoSaveTimeout = setTimeout(() => {
        const success = saveTimesheet(true); // Silent save
        if (success) {
            updateAutoSaveStatus('saved');
        } else {
            updateAutoSaveStatus('idle');
        }
    }, AUTO_SAVE_DELAY);
}

// Update auto-save status indicator
function updateAutoSaveStatus(status) {
    const indicator = document.getElementById('autoSaveStatus');
    if (!indicator) return;

    switch (status) {
        case 'saving':
            indicator.textContent = '💾 Saving...';
            indicator.className = 'auto-save-status saving';
            break;
        case 'saved':
            indicator.textContent = '✓ Saved';
            indicator.className = 'auto-save-status saved';
            // Clear "saved" status after 2 seconds
            setTimeout(() => {
                indicator.textContent = '';
                indicator.className = 'auto-save-status';
            }, 2000);
            break;
        case 'idle':
        default:
            indicator.textContent = '';
            indicator.className = 'auto-save-status';
            break;
    }
}

// Attach auto-save listeners to all inputs
function attachAutoSaveListeners() {
    // Header fields
    const headerFields = ['employeeName', 'supervisorName', 'payPeriodStart', 'payPeriodEnd',
                          'employeeSignature', 'supervisorSignature'];

    headerFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', triggerAutoSave);
            element.addEventListener('change', triggerAutoSave);
        }
    });

    // Table - delegate events from tbody
    const tbody = document.getElementById('timesheetBody');
    if (tbody) {
        tbody.addEventListener('input', triggerAutoSave);
        tbody.addEventListener('change', triggerAutoSave);
    }
}

// Load timesheet from localStorage
function loadTimesheet() {
    const lastKey = localStorage.getItem('lastSavedTimesheet');

    if (!lastKey) {
        alert('No saved timesheet found.');
        return;
    }

    const savedData = localStorage.getItem(lastKey);
    if (!savedData) {
        alert('No saved timesheet found.');
        return;
    }

    const timesheetData = JSON.parse(savedData);

    // Clear existing rows
    const tbody = document.getElementById('timesheetBody');
    tbody.innerHTML = '';
    rowCounter = 0;

    // Load header data
    setValue('employeeName', timesheetData.employeeName);
    setValue('supervisorName', timesheetData.supervisorName);
    setValue('payPeriod', timesheetData.payPeriod);
    setValue('payPeriodStart', timesheetData.payPeriodStart || '');
    setValue('payPeriodEnd', timesheetData.payPeriodEnd || '');
    setValue('employeeSignature', timesheetData.employeeSignature || '');
    setValue('supervisorSignature', timesheetData.supervisorSignature || '');

    // Load rows
    console.log(`Loading ${timesheetData.rows.length} rows from saved timesheet`);
    timesheetData.rows.forEach((rowData, index) => {
        console.log(`Loading row ${index + 1}:`, rowData);
        addNewRow();
        const newRowIndex = rowCounter - 1;

        setValue(`serviceType-${newRowIndex}`, rowData.serviceType);
        setValue(`serviceChoice-${newRowIndex}`, rowData.serviceChoice);
        setValue(`travelComments-${newRowIndex}`, rowData.travelComments);
        setValue(`clientName-${newRowIndex}`, rowData.clientName);
        setValue(`caseNumber-${newRowIndex}`, rowData.caseNumber);
        setValue(`date-${newRowIndex}`, rowData.date);
        setValue(`timeIn-${newRowIndex}`, rowData.timeIn);
        setValue(`timeOut-${newRowIndex}`, rowData.timeOut);
        setValue(`driveFrom-${newRowIndex}`, rowData.driveFrom);
        setValue(`driveTo-${newRowIndex}`, rowData.driveTo);
        setValue(`miles-${newRowIndex}`, rowData.miles ? Math.round(parseFloat(rowData.miles)) : '');
        setValue(`staffName-${newRowIndex}`, rowData.staffName);

        calculateRow(newRowIndex);
    });

    console.log(`Total rows in DOM after load: ${document.getElementById('timesheetBody').querySelectorAll('tr').length}`);
    alert(`Timesheet loaded successfully for ${timesheetData.employeeName}!`);
}

// Load timesheet by ID
function loadTimesheetById(id) {
    const key = `timesheet_${id}`;
    const savedData = localStorage.getItem(key);

    if (!savedData) {
        alert('Timesheet not found.');
        return;
    }

    const timesheetData = JSON.parse(savedData);
    currentTimesheetId = id;

    // Clear existing rows
    const tbody = document.getElementById('timesheetBody');
    tbody.innerHTML = '';
    rowCounter = 0;

    // Load header data
    setValue('employeeName', timesheetData.employeeName);
    setValue('supervisorName', timesheetData.supervisorName);
    setValue('payPeriod', timesheetData.payPeriod);
    setValue('payPeriodStart', timesheetData.payPeriodStart || '');
    setValue('payPeriodEnd', timesheetData.payPeriodEnd || '');
    setValue('employeeSignature', timesheetData.employeeSignature || '');
    setValue('supervisorSignature', timesheetData.supervisorSignature || '');

    // Load rows
    console.log(`Loading ${timesheetData.rows.length} rows into editor`);
    timesheetData.rows.forEach((rowData, index) => {
        console.log(`Loading row ${index + 1}:`, rowData);
        addNewRow();
        const newRowIndex = rowCounter - 1;

        setValue(`serviceType-${newRowIndex}`, rowData.serviceType);
        setValue(`serviceChoice-${newRowIndex}`, rowData.serviceChoice);
        setValue(`travelComments-${newRowIndex}`, rowData.travelComments);
        setValue(`clientName-${newRowIndex}`, rowData.clientName);
        setValue(`caseNumber-${newRowIndex}`, rowData.caseNumber);
        setValue(`date-${newRowIndex}`, rowData.date);
        setValue(`timeIn-${newRowIndex}`, rowData.timeIn);
        setValue(`timeOut-${newRowIndex}`, rowData.timeOut);
        setValue(`driveFrom-${newRowIndex}`, rowData.driveFrom);
        setValue(`driveTo-${newRowIndex}`, rowData.driveTo);
        setValue(`miles-${newRowIndex}`, rowData.miles ? Math.round(parseFloat(rowData.miles)) : '');
        setValue(`staffName-${newRowIndex}`, rowData.staffName);

        calculateRow(newRowIndex);
    });

    console.log(`Total rows in DOM: ${document.getElementById('timesheetBody').querySelectorAll('tr').length}`);
}

// ========================================
// MOBILE MENU FUNCTIONS
// ========================================

function toggleMobileMenu() {
    const tabs = document.getElementById('tabsContainer');
    const overlay = document.getElementById('mobileMenuOverlay');
    const btn = document.getElementById('mobileMenuBtn');
    const isOpen = tabs.classList.contains('mobile-open');
    if (isOpen) {
        closeMobileMenu();
    } else {
        tabs.classList.add('mobile-open');
        overlay.classList.add('active');
        btn.classList.add('open');
    }
}

function closeMobileMenu() {
    const tabs = document.getElementById('tabsContainer');
    const overlay = document.getElementById('mobileMenuOverlay');
    const btn = document.getElementById('mobileMenuBtn');
    tabs.classList.remove('mobile-open');
    overlay.classList.remove('active');
    btn.classList.remove('open');
}

// ========================================
// DASHBOARD FUNCTIONS
// ========================================

// Show dashboard view
function showDashboard() {
    document.getElementById('dashboardView').classList.add('active');
    document.getElementById('timesheetEditorView').classList.remove('active');
    document.getElementById('revenueReportView').classList.remove('active');
    document.getElementById('prfReportView').classList.remove('active');
    document.getElementById('dashboardTab').classList.add('active');
    document.getElementById('timesheetTab').classList.remove('active');
    document.getElementById('revenueTab').classList.remove('active');
    document.getElementById('prfTab').classList.remove('active');

    renderDashboard();
}

// Show timesheet editor view
function showTimesheetEditor(timesheetId = null) {
    document.getElementById('dashboardView').classList.remove('active');
    document.getElementById('timesheetEditorView').classList.add('active');
    document.getElementById('revenueReportView').classList.remove('active');
    document.getElementById('prfReportView').classList.remove('active');
    document.getElementById('dashboardTab').classList.remove('active');
    document.getElementById('timesheetTab').classList.add('active');
    document.getElementById('revenueTab').classList.remove('active');
    document.getElementById('prfTab').classList.remove('active');

    if (timesheetId) {
        loadTimesheetById(timesheetId);
    }
}

// Create new timesheet
function createNewTimesheet() {
    currentTimesheetId = null;
    clearAll();
    showTimesheetEditor();
}

// Render dashboard
function renderDashboard() {
    migrateExistingTimesheets(); // Ensure migration on first load

    const manifest = getManifest();
    const timesheets = Object.values(manifest.timesheets);

    // Apply filters
    const filtered = applyFilters(timesheets);

    // Apply sorting
    const sorted = applySorting(filtered);

    // Populate employee filter dropdown
    populateEmployeeFilter(timesheets);

    // Render list
    const listContainer = document.getElementById('timesheetList');

    if (sorted.length === 0) {
        listContainer.innerHTML = renderEmptyState();
    } else {
        listContainer.innerHTML = sorted.map(ts => renderTimesheetCard(ts)).join('');
    }
}

// Populate employee filter dropdown
function populateEmployeeFilter(timesheets) {
    const employeeFilter = document.getElementById('employeeFilter');
    const uniqueEmployees = [...new Set(timesheets.map(ts => ts.employeeName))].sort();

    // Keep "All Employees" option and add unique employees
    const currentValue = employeeFilter.value;
    employeeFilter.innerHTML = '<option value="all">All Employees</option>';
    uniqueEmployees.forEach(name => {
        if (name) {
            employeeFilter.innerHTML += `<option value="${name}">${name}</option>`;
        }
    });
    employeeFilter.value = currentValue;
}

// Render timesheet card
function renderTimesheetCard(timesheet) {
    const statusClass = `status-${timesheet.status}`;
    const lastModified = new Date(timesheet.updatedAt).toLocaleString();

    return `
        <div class="timesheet-card" data-id="${timesheet.id}">
            <div class="timesheet-card-header">
                <div class="timesheet-card-title">
                    ${timesheet.employeeName} | ${timesheet.payPeriod}
                </div>
                <span class="timesheet-status-badge ${statusClass}">
                    ${timesheet.status}
                </span>
            </div>

            <div class="timesheet-card-meta">
                <span>Last modified: ${lastModified}</span>
                <span>Created: ${new Date(timesheet.createdAt).toLocaleDateString()}</span>
            </div>

            <div class="timesheet-card-stats">
                <div class="stat-item">
                    <span class="stat-label">Hours:</span>
                    <span class="stat-value">${timesheet.totalHours}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mileage:</span>
                    <span class="stat-value">$${timesheet.totalMileageReimb}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Entries:</span>
                    <span class="stat-value">${timesheet.entryCount}</span>
                </div>
            </div>

            <div class="timesheet-card-actions">
                <button class="card-action-btn primary" onclick="editTimesheet('${timesheet.id}')">
                    ✏️ Edit
                </button>
                <button class="card-action-btn" onclick="archiveTimesheet('${timesheet.id}')">
                    📦 ${timesheet.status === 'submitted' ? 'Unarchive' : 'Archive'}
                </button>
                <button class="card-action-btn" onclick="exportTimesheetById('${timesheet.id}')">
                    📊 Export
                </button>
                <button class="card-action-btn danger" onclick="deleteTimesheet('${timesheet.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// Render empty state
function renderEmptyState() {
    const hasFilters = document.getElementById('searchInput').value ||
                       document.getElementById('statusFilter').value !== 'all' ||
                       document.getElementById('employeeFilter').value !== 'all';

    if (hasFilters) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No timesheets match your search</div>
                <div class="empty-state-message">Try adjusting your filters</div>
                <button class="btn btn-info" onclick="resetFilters()">Clear Filters</button>
            </div>
        `;
    }

    return `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No timesheets yet</div>
            <div class="empty-state-message">Click "Create New Timesheet" to get started</div>
            <button class="btn btn-primary" onclick="createNewTimesheet()">Create New Timesheet</button>
        </div>
    `;
}

// Apply filters
function applyFilters(timesheets) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const employeeFilter = document.getElementById('employeeFilter').value;

    return timesheets.filter(ts => {
        // Search filter
        if (searchTerm) {
            const matchesSearch =
                (ts.employeeName && ts.employeeName.toLowerCase().includes(searchTerm)) ||
                (ts.supervisorName && ts.supervisorName.toLowerCase().includes(searchTerm)) ||
                (ts.payPeriod && ts.payPeriod.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && ts.status !== statusFilter) {
            return false;
        }

        // Employee filter
        if (employeeFilter !== 'all' && ts.employeeName !== employeeFilter) {
            return false;
        }

        return true;
    });
}

// Apply sorting (default: by updatedAt descending)
function applySorting(timesheets) {
    return [...timesheets].sort((a, b) => {
        const aDate = new Date(a.updatedAt).getTime();
        const bDate = new Date(b.updatedAt).getTime();
        return bDate - aDate; // Descending order (newest first)
    });
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('employeeFilter').value = 'all';
    renderDashboard();
}

// Dashboard action functions
function editTimesheet(id) {
    showTimesheetEditor(id);
}

function deleteTimesheet(id) {
    const manifest = getManifest();
    const timesheet = manifest.timesheets[id];

    if (confirm(`Delete timesheet for ${timesheet.employeeName} (${timesheet.payPeriod})?\n\nThis cannot be undone.`)) {
        localStorage.removeItem(`timesheet_${id}`);
        removeFromManifest(id);
        renderDashboard();
    }
}

function archiveTimesheet(id) {
    const key = `timesheet_${id}`;
    const data = JSON.parse(localStorage.getItem(key));

    if (data.status === 'submitted') {
        data.status = 'draft';
    } else {
        data.status = 'submitted';
    }

    data.updatedAt = getCurrentTimestamp();
    localStorage.setItem(key, JSON.stringify(data));
    updateManifestEntry(data);
    renderDashboard();
}

function exportTimesheetById(id) {
    loadTimesheetById(id);
    setTimeout(() => {
        exportToExcel();
    }, 100);
}

// Export to Excel using billing template (API-backed with formulas preserved)
async function exportToExcel() {
    const exportBtn = document.querySelector('button[onclick="exportToExcel()"]');
    const originalText = exportBtn ? exportBtn.textContent : '';

    try {
        // Show loading state
        if (exportBtn) {
            exportBtn.textContent = 'Generating...';
            exportBtn.disabled = true;
        }

        // Build payload for the API
        const payload = {
            header: {
                employeeName: getValue('employeeName') || '',
                supervisorName: getValue('supervisorName') || '',
                payPeriod: getValue('payPeriod') || '',
                employeeSignature: getValue('employeeSignature') || '',
                supervisorSignature: getValue('supervisorSignature') || ''
            },
            rows: []
        };

        // Collect data from each row
        const tbody = document.getElementById('timesheetBody');
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            const rowIndex = row.dataset.rowIndex;
            const rowData = {
                serviceType:    getValue(`serviceType-${rowIndex}`),
                serviceChoice:  getValue(`serviceChoice-${rowIndex}`),
                travelComments: getValue(`travelComments-${rowIndex}`),
                clientName:     getValue(`clientName-${rowIndex}`),
                caseNumber:     getValue(`caseNumber-${rowIndex}`),
                dateOfService:  getValue(`date-${rowIndex}`),
                timeIn:         getValue(`timeIn-${rowIndex}`),
                timeOut:        getValue(`timeOut-${rowIndex}`),
                driveFrom:      getValue(`driveFrom-${rowIndex}`),
                driveTo:        getValue(`driveTo-${rowIndex}`),
                miles:          getValue(`miles-${rowIndex}`),
                staffName:      getValue(`staffName-${rowIndex}`),
                paidLeave:      getValue(`paidLeave-${rowIndex}`),
                paidHours:      getValue(`paidHours-${rowIndex}`),
                meetingHours:   getValue(`meetingHours-${rowIndex}`),
                trainingHours:  getValue(`trainingHours-${rowIndex}`),
                driveNonBill:   getValue(`driveNonBill-${rowIndex}`),
                docTime:        getValue(`docTime-${rowIndex}`),
                mileageAdj:     getValue(`mileageAdj-${rowIndex}`),
                odometerStart:  getValue(`odometerStart-${rowIndex}`),
                odometerStop:   getValue(`odometerStop-${rowIndex}`)
            };
            payload.rows.push(rowData);
        });

        // Call the API
        const response = await fetch('/api/export-timesheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server error ${response.status}`);
        }

        // Download the file from the response blob
        const blob = await response.blob();
        const employeeName = getValue('employeeName') || 'Unnamed';
        const payPeriod = getValue('payPeriod') || 'No_Date';
        const filename = `${employeeName}_${payPeriod}_Timesheet.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert(`Billing template "${filename}" has been downloaded with formulas!`);

    } catch (err) {
        console.error('Template export failed, falling back to basic export:', err);
        alert('Billing template export failed. Falling back to basic Excel export.\n\nNote: The basic export will not include billing formulas.');
        exportToExcelBasic();
    } finally {
        // Restore button state
        if (exportBtn) {
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        }
    }
}

// Fallback: Basic export using SheetJS (no formulas/formatting)
function exportToExcelBasic() {
    const employeeName = getValue('employeeName') || 'Unnamed';
    const payPeriod = getValue('payPeriod') || 'No_Date';

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data array
    const data = [];

    // Header info rows
    data.push(['Version- 9.8', '', '', '', '', '', '', '', '', '', '', '', 'V=Vac', '', 'Name:', getValue('employeeName')]);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', 'S=Sick', '', 'Supervisor:', getValue('supervisorName')]);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', 'H=Holiday', '', 'Pay Period:', getValue('payPeriod')]);
    data.push([]);
    data.push(['I certify these hours are true and accurate to the best of my knowledge.']);
    data.push(['Employee Signature/Date:', getValue('employeeSignature'), '', '', '', 'Supervisor Signature/Date:', getValue('supervisorSignature')]);
    data.push([]);

    // Column headers
    const headers = [
        'SERVICE TYPES',
        'SERVICE CHOICES PREP VIRTUAL',
        'TRAVEL COMMENTS',
        'Last Name, First Name Name of Client(s)',
        'Master Case #',
        'Date of Service MM/DD/YY',
        'hrs:mins Time in',
        'hrs:mins Time out',
        'Drive From Address',
        'Drive To Address',
        'Miles',
        'Staff Name',
        'Paid Leave (V, S, H)',
        'Paid Hours',
        'Meeting in hours',
        'Training in hours',
        'Transport Bill Time',
        'Drive Non-Bill',
        'Doc Time in hours',
        'Mileage Adjustment',
        'Odometer Start',
        'Odometer Stop',
        'Total Mileage',
        'Billable Hours',
        'IndHrs - Drive Non-Bill',
        'Indirect Hours',
        'Drive Total',
        'DAILY TOTAL',
        'Mileage Reimb.'
    ];
    data.push(headers);

    // Data rows
    const tbody = document.getElementById('timesheetBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowIndex = row.dataset.rowIndex;
        const rowData = [
            getValue(`serviceType-${rowIndex}`),
            getValue(`serviceChoice-${rowIndex}`),
            getValue(`travelComments-${rowIndex}`),
            getValue(`clientName-${rowIndex}`),
            getValue(`caseNumber-${rowIndex}`),
            getValue(`date-${rowIndex}`),
            getValue(`timeIn-${rowIndex}`),
            getValue(`timeOut-${rowIndex}`),
            getValue(`driveFrom-${rowIndex}`),
            getValue(`driveTo-${rowIndex}`),
            getValue(`miles-${rowIndex}`),
            getValue(`staffName-${rowIndex}`),
            getValue(`paidLeave-${rowIndex}`),
            getValue(`paidHours-${rowIndex}`),
            getValue(`meetingHours-${rowIndex}`),
            getValue(`trainingHours-${rowIndex}`),
            getValue(`transportBillTime-${rowIndex}`),
            getValue(`driveNonBill-${rowIndex}`),
            getValue(`docTime-${rowIndex}`),
            getValue(`mileageAdj-${rowIndex}`),
            getValue(`odometerStart-${rowIndex}`),
            getValue(`odometerStop-${rowIndex}`),
            getValue(`totalMileage-${rowIndex}`),
            getValue(`billableHours-${rowIndex}`),
            getValue(`indHrsDriveNonBill-${rowIndex}`),
            getValue(`indirectHours-${rowIndex}`),
            getValue(`driveTotal-${rowIndex}`),
            getValue(`dailyTotal-${rowIndex}`),
            getValue(`mileageReimb-${rowIndex}`)
        ];
        data.push(rowData);
    });

    // Totals row
    const totalsRow = [
        'TOTALS:', '', '', '', '', '', '', '', '', '',
        document.getElementById('totalMiles').textContent,
        '',
        '',
        document.getElementById('totalPaidHours').textContent,
        document.getElementById('totalMeetingHours').textContent,
        document.getElementById('totalTrainingHours').textContent,
        document.getElementById('totalTransportBillTime').textContent,
        document.getElementById('totalDriveNonBill').textContent,
        document.getElementById('totalDocTime').textContent,
        document.getElementById('totalMileageAdj').textContent,
        '',
        '',
        document.getElementById('totalMileageTotal').textContent,
        document.getElementById('totalBillableHours').textContent,
        document.getElementById('totalIndHrsDriveNonBill').textContent,
        document.getElementById('totalIndirectHours').textContent,
        document.getElementById('totalDriveTotal').textContent,
        document.getElementById('totalDailyTotal').textContent,
        document.getElementById('totalMileageReimb').textContent
    ];
    data.push(totalsRow);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');

    // Save file
    const filename = `${employeeName}_${payPeriod}_Timesheet.xlsx`;
    XLSX.writeFile(wb, filename);

    alert(`Excel file "${filename}" has been downloaded!`);
}

// ========================================
// BILLING RATES & REVENUE REPORT
// ========================================

// Service billing rates - Effective 7/1/24 - 6/30/25
const BILLING_RATES = {
    'FS.IH':            { rate: 67.00, unit: 'hour', name: 'In-Home Family Support (IHFS)', notes: 'Direct face-to-face contact only' },
    'FS.IH.Virtual':    { rate: 67.00, unit: 'hour', name: 'Virtual In-Home Family Support', notes: 'Video conferencing (no travel)' },
    'FS.IH.Prep':       { rate: 33.50, unit: 'occurrence', name: 'Service Prep IHFS', notes: 'When family no-shows or cancels en-route' },
    'FS.OH':            { rate: 67.00, unit: 'hour', name: 'Out-of-Home Family Support (OHFS)', notes: 'Direct face-to-face contact only' },
    'PT':               { rate: 67.00, unit: 'hour', name: 'Parenting Time/Supervised Visitation (PTSV)', notes: 'Direct face-to-face contact only' },
    'PT.Virtual':       { rate: 67.00, unit: 'hour', name: 'Virtual PTSV', notes: 'Video conferencing (no travel)' },
    'PT.Prep':          { rate: 33.50, unit: 'occurrence', name: 'Service Prep PTSV', notes: 'When family no-shows or cancels en-route' },
    'PT.health':        { rate: 67.00, unit: 'hour', name: 'PTSV - Health Related', notes: 'Direct face-to-face contact only' },
    'Child.Supervision':{ rate: 33.50, unit: 'hour', name: 'Child Supervision', notes: 'When left alone with child 30+ min' },
    'Travel-PT':        { rate: 35.00, unit: 'hour', name: 'Travel Time - PTSV', notes: 'Plus federal mileage ($0.725/mile)' },
    'Travel-PT-Kids':   { rate: 35.00, unit: 'hour', name: 'Travel Time - PTSV (Kids)', notes: 'Plus federal mileage ($0.725/mile)' },
    'Travel-FS-IH':     { rate: 35.00, unit: 'hour', name: 'Travel Time - Family Support (IH)', notes: 'Plus federal mileage ($0.725/mile)' },
    'Travel-FS-OH':     { rate: 35.00, unit: 'hour', name: 'Travel Time - Family Support (OH)', notes: 'Plus federal mileage ($0.725/mile)' },
    'Travel-DT':        { rate: 35.00, unit: 'hour', name: 'Travel Time - Drug Testing', notes: 'Plus federal mileage ($0.725/mile)' },
    'DT.Urine':         { rate: 78.25, unit: 'specimen', name: 'Drug Testing - Urine', notes: 'Per specimen collection' },
    'DT.Swab':          { rate: 78.25, unit: 'specimen', name: 'Drug Testing - Oral Swab', notes: 'Per specimen collection' },
    'DT.Hair':          { rate: 78.25, unit: 'specimen', name: 'Drug Testing - Hair Follicle', notes: 'Per specimen collection' },
    'DT.Sweat':         { rate: 78.25, unit: 'specimen', name: 'Drug Testing - Sweat Patch', notes: 'Per specimen collection' },
    'DT.Lab.Confirm':   { rate: 130.44, unit: 'test', name: 'Drug Testing - Lab Confirmation', notes: 'Sweat patch lab confirmation' },
    'DT.Refusal':       { rate: 19.55, unit: 'occurrence', name: 'Drug Testing - Refusal', notes: 'When client refuses collection' },
    'DT.Admission':     { rate: 19.55, unit: 'occurrence', name: 'Drug Testing - Admission', notes: 'When client admits substance use' },
    'DT.NoShow':        { rate: 19.55, unit: 'occurrence', name: 'Drug Testing - No-Show', notes: 'When family doesn\'t show (with pre-call documented)' },
    'DT.Other':         { rate: 78.25, unit: 'specimen', name: 'Drug Testing - Other', notes: 'Other specimen types' }
};

const BILLING_MILEAGE_RATE = 0.725; // Federal mileage rate
const BILLING_PERIOD = '7/1/24 - 6/30/25';

// Show revenue report view
function showRevenueReport() {
    document.getElementById('dashboardView').classList.remove('active');
    document.getElementById('timesheetEditorView').classList.remove('active');
    document.getElementById('revenueReportView').classList.add('active');
    document.getElementById('prfReportView').classList.remove('active');
    document.getElementById('dashboardTab').classList.remove('active');
    document.getElementById('timesheetTab').classList.remove('active');
    document.getElementById('revenueTab').classList.add('active');
    document.getElementById('prfTab').classList.remove('active');

    populateReportEmployeeFilter();
    renderRateCard();
}

// Populate employee filter for revenue report
function populateReportEmployeeFilter() {
    const manifest = getManifest();
    const timesheets = Object.values(manifest.timesheets);
    const uniqueEmployees = [...new Set(timesheets.map(ts => ts.employeeName))].filter(Boolean).sort();

    const select = document.getElementById('reportEmployeeFilter');
    const currentValue = select.value;
    select.innerHTML = '<option value="all">All Employees</option>';
    uniqueEmployees.forEach(name => {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
    select.value = currentValue;
}

// Generate revenue report from all timesheet data
function generateRevenueReport() {
    const startDate = getValue('reportStartDate');
    const endDate = getValue('reportEndDate');
    const employeeFilter = document.getElementById('reportEmployeeFilter').value;

    // Collect all rows from all timesheets
    const manifest = getManifest();
    const allRows = [];

    Object.keys(manifest.timesheets).forEach(id => {
        const raw = localStorage.getItem(`timesheet_${id}`);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.rows) return;

        // Apply employee filter at timesheet level
        if (employeeFilter !== 'all' && data.employeeName !== employeeFilter) return;

        data.rows.forEach(row => {
            // Apply date filter
            if (startDate && row.date && row.date < startDate) return;
            if (endDate && row.date && row.date > endDate) return;

            // Skip empty rows
            if (!row.serviceType) return;

            allRows.push({
                ...row,
                employeeName: data.employeeName,
                payPeriod: data.payPeriod
            });
        });
    });

    // Calculate revenue
    const revenueData = calculateRevenueFromRows(allRows);

    // Render results
    renderRevenueResults(revenueData, allRows);
}

// Calculate revenue from an array of timesheet rows
function calculateRevenueFromRows(rows) {
    const byService = {};
    const byEmployee = {};
    let totalServiceRevenue = 0;
    let totalTravelRevenue = 0;
    let totalMileageRevenue = 0;
    let totalDrugTestRevenue = 0;
    let totalPrepRevenue = 0;

    rows.forEach(row => {
        const serviceType = row.serviceType;
        if (!serviceType) return;

        const rateInfo = BILLING_RATES[serviceType];
        if (!rateInfo) return;

        // Initialize service entry
        if (!byService[serviceType]) {
            byService[serviceType] = {
                name: rateInfo.name,
                rate: rateInfo.rate,
                unit: rateInfo.unit,
                notes: rateInfo.notes,
                entries: 0,
                hours: 0,
                miles: 0,
                serviceRevenue: 0,
                mileageRevenue: 0,
                totalRevenue: 0
            };
        }

        const entry = byService[serviceType];
        entry.entries++;

        // Calculate revenue based on unit type
        let rowRevenue = 0;
        if (rateInfo.unit === 'hour') {
            const hours = parseFloat(row.billableHours) || 0;
            entry.hours += hours;
            rowRevenue = hours * rateInfo.rate;
        } else {
            // Per occurrence/specimen/test - flat rate per entry
            rowRevenue = rateInfo.rate;
        }
        entry.serviceRevenue += rowRevenue;

        // Mileage revenue for travel types
        let mileageRev = 0;
        if (serviceType.startsWith('Travel-')) {
            const miles = parseFloat(row.miles) || 0;
            entry.miles += miles;
            mileageRev = miles * BILLING_MILEAGE_RATE;
            entry.mileageRevenue += mileageRev;
            totalMileageRevenue += mileageRev;
        }

        entry.totalRevenue = entry.serviceRevenue + entry.mileageRevenue;

        // Categorize revenue
        if (serviceType.startsWith('Travel-')) {
            totalTravelRevenue += rowRevenue;
        } else if (serviceType.startsWith('DT.')) {
            totalDrugTestRevenue += rowRevenue;
        } else if (serviceType.includes('.Prep')) {
            totalPrepRevenue += rowRevenue;
        } else {
            totalServiceRevenue += rowRevenue;
        }

        // Track by employee
        const empName = row.employeeName || 'Unknown';
        if (!byEmployee[empName]) {
            byEmployee[empName] = {
                serviceHours: 0,
                travelHours: 0,
                tests: 0,
                miles: 0,
                revenue: 0,
                mileageRevenue: 0
            };
        }

        const emp = byEmployee[empName];
        if (serviceType.startsWith('Travel-')) {
            emp.travelHours += parseFloat(row.billableHours) || 0;
            emp.miles += parseFloat(row.miles) || 0;
            emp.mileageRevenue += mileageRev;
        } else if (serviceType.startsWith('DT.') || rateInfo.unit !== 'hour') {
            emp.tests++;
        } else {
            emp.serviceHours += parseFloat(row.billableHours) || 0;
        }
        emp.revenue += rowRevenue + mileageRev;
    });

    const grandTotal = totalServiceRevenue + totalTravelRevenue + totalMileageRevenue + totalDrugTestRevenue + totalPrepRevenue;

    return {
        byService,
        byEmployee,
        totals: {
            grandTotal,
            serviceRevenue: totalServiceRevenue,
            travelRevenue: totalTravelRevenue,
            mileageRevenue: totalMileageRevenue,
            drugTestRevenue: totalDrugTestRevenue,
            prepRevenue: totalPrepRevenue,
            totalEntries: rows.length
        }
    };
}

// Format currency
function fmtCurrency(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Render revenue report results
function renderRevenueResults(data, rows) {
    const container = document.getElementById('revenueReportResults');

    if (rows.length === 0) {
        container.innerHTML = `
            <div class="report-empty-state">
                <p>No timesheet entries found for the selected filters.</p>
                <p>Try adjusting your date range or employee filter.</p>
            </div>
        `;
        return;
    }

    const { byService, byEmployee, totals } = data;

    let html = '';

    // Summary cards
    html += `
        <div class="report-summary">
            <div class="summary-card total">
                <div class="summary-label">Total Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.grandTotal)}</div>
                <div class="summary-detail">${totals.totalEntries} entries</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Service Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.serviceRevenue)}</div>
                <div class="summary-detail">FS, PT, Child Supervision</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Travel Time Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.travelRevenue)}</div>
                <div class="summary-detail">@ $35.00/hr</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Mileage Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.mileageRevenue)}</div>
                <div class="summary-detail">@ $0.725/mile</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Drug Testing Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.drugTestRevenue)}</div>
                <div class="summary-detail">Specimens, labs, etc.</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Service Prep Revenue</div>
                <div class="summary-value">${fmtCurrency(totals.prepRevenue)}</div>
                <div class="summary-detail">No-shows, cancellations</div>
            </div>
        </div>
    `;

    // Detailed breakdown by service type
    const serviceEntries = Object.entries(byService).sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);

    html += `
        <div class="report-section">
            <h3>Revenue by Service Type</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Entries</th>
                        <th>Hours</th>
                        <th>Miles</th>
                        <th>Rate</th>
                        <th>Service Revenue</th>
                        <th>Mileage Revenue</th>
                        <th>Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
    `;

    serviceEntries.forEach(([key, svc]) => {
        const unitLabel = svc.unit === 'hour' ? '/hr' : '/' + svc.unit;
        html += `
            <tr>
                <td class="service-name-cell">${svc.name}</td>
                <td>${svc.entries}</td>
                <td>${svc.unit === 'hour' ? svc.hours.toFixed(2) : '-'}</td>
                <td>${svc.miles > 0 ? svc.miles.toFixed(1) : '-'}</td>
                <td>${fmtCurrency(svc.rate)}${unitLabel}</td>
                <td>${fmtCurrency(svc.serviceRevenue)}</td>
                <td>${svc.mileageRevenue > 0 ? fmtCurrency(svc.mileageRevenue) : '-'}</td>
                <td class="revenue-total-cell">${fmtCurrency(svc.totalRevenue)}</td>
            </tr>
        `;
    });

    const totalServiceRev = serviceEntries.reduce((sum, [, s]) => sum + s.serviceRevenue, 0);
    const totalMileageRev = serviceEntries.reduce((sum, [, s]) => sum + s.mileageRevenue, 0);
    const totalAllRev = serviceEntries.reduce((sum, [, s]) => sum + s.totalRevenue, 0);

    html += `
                    <tr class="report-totals-row">
                        <td><strong>TOTALS</strong></td>
                        <td><strong>${rows.length}</strong></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td><strong>${fmtCurrency(totalServiceRev)}</strong></td>
                        <td><strong>${fmtCurrency(totalMileageRev)}</strong></td>
                        <td class="revenue-total-cell"><strong>${fmtCurrency(totalAllRev)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Breakdown by employee
    const empEntries = Object.entries(byEmployee).sort((a, b) => b[1].revenue - a[1].revenue);

    html += `
        <div class="report-section">
            <h3>Revenue by Employee</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Service Hours</th>
                        <th>Travel Hours</th>
                        <th>Tests/Occurrences</th>
                        <th>Miles</th>
                        <th>Mileage Revenue</th>
                        <th>Total Revenue</th>
                    </tr>
                </thead>
                <tbody>
    `;

    empEntries.forEach(([name, emp]) => {
        html += `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${emp.serviceHours.toFixed(2)}</td>
                <td>${emp.travelHours.toFixed(2)}</td>
                <td>${emp.tests}</td>
                <td>${emp.miles.toFixed(1)}</td>
                <td>${fmtCurrency(emp.mileageRevenue)}</td>
                <td class="revenue-total-cell">${fmtCurrency(emp.revenue)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// Render the rate card reference table
function renderRateCard() {
    const panel = document.getElementById('rateCardPanel');

    let html = `
        <div class="rate-card-content">
            <h3>Service Rates - Effective ${BILLING_PERIOD}</h3>
            <table class="report-table rate-card-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Rate</th>
                        <th>Unit</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const categories = {
        'Family Support': ['FS.IH', 'FS.IH.Virtual', 'FS.IH.Prep', 'FS.OH'],
        'Parenting Time / Supervised Visitation': ['PT', 'PT.Virtual', 'PT.Prep', 'PT.health', 'Child.Supervision'],
        'Travel': ['Travel-FS-IH', 'Travel-FS-OH', 'Travel-PT', 'Travel-PT-Kids', 'Travel-DT'],
        'Drug Testing': ['DT.Urine', 'DT.Swab', 'DT.Hair', 'DT.Sweat', 'DT.Lab.Confirm', 'DT.Refusal', 'DT.Admission', 'DT.NoShow', 'DT.Other']
    };

    Object.entries(categories).forEach(([category, types]) => {
        html += `<tr class="rate-card-category"><td colspan="4"><strong>${category}</strong></td></tr>`;
        types.forEach(type => {
            const info = BILLING_RATES[type];
            if (info) {
                html += `
                    <tr>
                        <td>${info.name}</td>
                        <td><strong>$${info.rate.toFixed(2)}</strong></td>
                        <td>${info.unit === 'hour' ? 'Hourly' : 'Per ' + info.unit}</td>
                        <td class="rate-notes">${info.notes}</td>
                    </tr>
                `;
            }
        });
    });

    html += `
        <tr class="rate-card-category"><td colspan="4"><strong>Mileage</strong></td></tr>
        <tr>
            <td>Federal Mileage Reimbursement</td>
            <td><strong>$${BILLING_MILEAGE_RATE.toFixed(2)}</strong></td>
            <td>Per mile</td>
            <td class="rate-notes">As of 1/1/24</td>
        </tr>
    `;

    html += `
                </tbody>
            </table>
        </div>
    `;

    panel.innerHTML = html;
}

// Toggle rate card visibility
function toggleRateCard() {
    const panel = document.getElementById('rateCardPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        renderRateCard();
    } else {
        panel.style.display = 'none';
    }
}

// Export revenue report to Excel
function exportRevenueReport() {
    const startDate = getValue('reportStartDate');
    const endDate = getValue('reportEndDate');
    const employeeFilter = document.getElementById('reportEmployeeFilter').value;

    const manifest = getManifest();
    const allRows = [];

    Object.keys(manifest.timesheets).forEach(id => {
        const raw = localStorage.getItem(`timesheet_${id}`);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.rows) return;
        if (employeeFilter !== 'all' && data.employeeName !== employeeFilter) return;

        data.rows.forEach(row => {
            if (startDate && row.date && row.date < startDate) return;
            if (endDate && row.date && row.date > endDate) return;
            if (!row.serviceType) return;

            allRows.push({
                ...row,
                employeeName: data.employeeName,
                payPeriod: data.payPeriod
            });
        });
    });

    if (allRows.length === 0) {
        alert('No data to export. Please generate a report first.');
        return;
    }

    const revenueData = calculateRevenueFromRows(allRows);
    const { byService, byEmployee, totals } = revenueData;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
        ['REVENUE REPORT'],
        ['Generated:', new Date().toLocaleDateString()],
        ['Period:', startDate ? `${startDate} to ${endDate}` : 'All dates'],
        ['Employee:', employeeFilter === 'all' ? 'All Employees' : employeeFilter],
        [],
        ['SUMMARY'],
        ['Total Revenue', totals.grandTotal],
        ['Service Revenue', totals.serviceRevenue],
        ['Travel Time Revenue', totals.travelRevenue],
        ['Mileage Revenue', totals.mileageRevenue],
        ['Drug Testing Revenue', totals.drugTestRevenue],
        ['Service Prep Revenue', totals.prepRevenue],
        ['Total Entries', totals.totalEntries],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Service breakdown sheet
    const serviceData = [
        ['REVENUE BY SERVICE TYPE'],
        [],
        ['Service', 'Entries', 'Hours', 'Miles', 'Rate', 'Unit', 'Service Revenue', 'Mileage Revenue', 'Total Revenue']
    ];

    Object.entries(byService).sort((a, b) => b[1].totalRevenue - a[1].totalRevenue).forEach(([key, svc]) => {
        serviceData.push([
            svc.name,
            svc.entries,
            svc.unit === 'hour' ? parseFloat(svc.hours.toFixed(2)) : '',
            svc.miles > 0 ? parseFloat(svc.miles.toFixed(1)) : '',
            svc.rate,
            svc.unit,
            parseFloat(svc.serviceRevenue.toFixed(2)),
            svc.mileageRevenue > 0 ? parseFloat(svc.mileageRevenue.toFixed(2)) : '',
            parseFloat(svc.totalRevenue.toFixed(2))
        ]);
    });

    const serviceWs = XLSX.utils.aoa_to_sheet(serviceData);
    XLSX.utils.book_append_sheet(wb, serviceWs, 'By Service');

    // Employee breakdown sheet
    const empData = [
        ['REVENUE BY EMPLOYEE'],
        [],
        ['Employee', 'Service Hours', 'Travel Hours', 'Tests/Occurrences', 'Miles', 'Mileage Revenue', 'Total Revenue']
    ];

    Object.entries(byEmployee).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([name, emp]) => {
        empData.push([
            name,
            parseFloat(emp.serviceHours.toFixed(2)),
            parseFloat(emp.travelHours.toFixed(2)),
            emp.tests,
            parseFloat(emp.miles.toFixed(1)),
            parseFloat(emp.mileageRevenue.toFixed(2)),
            parseFloat(emp.revenue.toFixed(2))
        ]);
    });

    const empWs = XLSX.utils.aoa_to_sheet(empData);
    XLSX.utils.book_append_sheet(wb, empWs, 'By Employee');

    // Rate card sheet
    const rateData = [
        ['SERVICE RATE CARD'],
        ['Effective Period:', BILLING_PERIOD],
        [],
        ['Service', 'Rate', 'Unit', 'Notes']
    ];

    Object.entries(BILLING_RATES).forEach(([key, info]) => {
        rateData.push([info.name, info.rate, info.unit, info.notes]);
    });

    rateData.push([]);
    rateData.push(['Federal Mileage Rate', BILLING_MILEAGE_RATE, 'per mile', 'As of 1/1/24']);

    const rateWs = XLSX.utils.aoa_to_sheet(rateData);
    XLSX.utils.book_append_sheet(wb, rateWs, 'Rate Card');

    const dateStr = startDate || 'all';
    const filename = `Revenue_Report_${dateStr}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    alert(`Revenue report exported as "${filename}"`);
}

// ========================================
// PRF (PERSONAL REIMBURSEMENT FORM) REPORT
// ========================================

const PRF_MILEAGE_RATE_DEFAULT = 0.70;
let prfRowCounter = 0;

// Show PRF report view
function showPRFReport() {
    document.getElementById('dashboardView').classList.remove('active');
    document.getElementById('timesheetEditorView').classList.remove('active');
    document.getElementById('revenueReportView').classList.remove('active');
    document.getElementById('prfReportView').classList.add('active');
    document.getElementById('dashboardTab').classList.remove('active');
    document.getElementById('timesheetTab').classList.remove('active');
    document.getElementById('revenueTab').classList.remove('active');
    document.getElementById('prfTab').classList.add('active');

    populatePRFEmployeeFilter();
    initPRFUpload();

    // Add default empty rows if table is empty
    const tbody = document.getElementById('prfTableBody');
    if (tbody && tbody.children.length === 0) {
        for (let i = 0; i < 20; i++) {
            addPRFRow();
        }
    }
}

// Initialize PRF file upload handlers
let prfUploadInitialized = false;
function initPRFUpload() {
    if (prfUploadInitialized) return;
    prfUploadInitialized = true;

    const dropZone = document.getElementById('prfDropZone');
    const fileInput = document.getElementById('prfFileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handlePRFFile(e.target.files[0]);
    });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handlePRFFile(e.dataTransfer.files[0]);
    });
}

// Handle uploaded Excel file
function handlePRFFile(file) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please upload an Excel file (.xlsx or .xls)');
        return;
    }

    const fileInfo = document.getElementById('prfFileInfo');
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `<strong>File:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            parseExcelForPRF(workbook, file.name);
        } catch (err) {
            alert('Error reading Excel file: ' + err.message);
            console.error('Excel parse error:', err);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Parse Excel and populate the PRF grid
function parseExcelForPRF(workbook, filename) {
    // Try TravelLogs sheet first, then Timesheet, then first sheet
    let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('travellog'))
        || workbook.SheetNames.find(n => n.toLowerCase().includes('timesheet'))
        || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    if (rawRows.length < 2) { alert('No data found in the Excel file.'); return; }

    // Find header row
    let headerRowIndex = -1;
    let headerMap = {};

    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i];
        const rowStr = row.map(c => String(c || '').toLowerCase()).join('|');
        if (rowStr.includes('service') && (rowStr.includes('client') || rowStr.includes('date') || rowStr.includes('staff'))) {
            headerRowIndex = i;
            row.forEach((cell, col) => {
                const val = String(cell || '').toLowerCase().trim();
                if (val.includes('service type') || val === 'service types') headerMap.serviceType = col;
                else if (val.includes('client')) headerMap.clientName = col;
                else if (val.includes('date')) headerMap.date = col;
                else if (val.includes('drive') && val.includes('from')) headerMap.driveFrom = col;
                else if (val.includes('drive') && val.includes('to')) headerMap.driveTo = col;
                else if (val === 'miles' || (val.includes('mile') && !val.includes('total') && !val.includes('reimb'))) headerMap.miles = col;
                else if (val.includes('staff')) headerMap.staffName = col;
            });
            break;
        }
    }

    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        headerMap = { serviceType: 3, clientName: 6, date: 8, driveFrom: 11, driveTo: 12, miles: 13, staffName: 14 };
    }

    // Clear existing rows and populate
    const tbody = document.getElementById('prfTableBody');
    tbody.innerHTML = '';
    prfRowCounter = 0;

    let entryCount = 0;
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const serviceType = String(row[headerMap.serviceType] || '').trim();
        const clientName = String(row[headerMap.clientName] || '').trim();
        if (!serviceType && !clientName) continue;
        if (String(row[0] || '').toLowerCase().includes('total')) continue;

        // Parse date
        let dateVal = row[headerMap.date] || '';
        if (dateVal instanceof Date) {
            dateVal = `${(dateVal.getMonth()+1).toString().padStart(2,'0')}/${dateVal.getDate().toString().padStart(2,'0')}/${String(dateVal.getFullYear()).slice(-2)}`;
        } else if (typeof dateVal === 'number') {
            const d = new Date((dateVal - 25569) * 86400000);
            dateVal = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
        }

        const miles = parseFloat(row[headerMap.miles]) || 0;

        // Build explanation from drive from/to
        const driveFrom = String(row[headerMap.driveFrom] || '').trim();
        const driveTo = String(row[headerMap.driveTo] || '').trim();
        let explanation = '';
        if (driveFrom && driveTo) {
            explanation = `${driveFrom}/${driveTo}`;
        } else if (serviceType) {
            explanation = serviceType;
        }

        // Notes = client name(s)
        const notes = clientName;

        addPRFRow(dateVal, explanation, notes, miles);
        entryCount++;
    }

    // Pad with empty rows to fill the form
    const minRows = 20;
    for (let i = entryCount; i < minRows; i++) {
        addPRFRow();
    }

    recalcAllPRFRows();
    console.log(`Imported ${entryCount} entries from ${filename}`);
}

// Populate PRF employee filter
function populatePRFEmployeeFilter() {
    const manifest = getManifest();
    const timesheets = Object.values(manifest.timesheets);
    const uniqueEmployees = [...new Set(timesheets.map(ts => ts.employeeName))].filter(Boolean).sort();

    const select = document.getElementById('prfEmployeeFilter');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Employee...</option>';
    uniqueEmployees.forEach(name => {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
    select.value = currentValue;
}

// Generate PRF from saved timesheets
function generatePRFFromTimesheets() {
    const employeeFilter = document.getElementById('prfEmployeeFilter').value;
    const startDate = getValue('prfStartDate');
    const endDate = getValue('prfEndDate');

    if (!employeeFilter) { alert('Please select an employee.'); return; }

    const manifest = getManifest();
    const entries = [];

    Object.keys(manifest.timesheets).forEach(id => {
        const raw = localStorage.getItem(`timesheet_${id}`);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.rows) return;
        if (data.employeeName !== employeeFilter) return;

        data.rows.forEach(row => {
            if (!row.serviceType) return;
            if (startDate && row.date && row.date < startDate) return;
            if (endDate && row.date && row.date > endDate) return;

            entries.push({
                date: row.date || '',
                serviceType: row.serviceType || '',
                clientName: row.clientName || '',
                driveFrom: row.driveFrom || '',
                driveTo: row.driveTo || '',
                miles: parseFloat(row.miles) || 0
            });
        });
    });

    if (entries.length === 0) { alert('No entries found for the selected filters.'); return; }

    entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Clear and populate
    const tbody = document.getElementById('prfTableBody');
    tbody.innerHTML = '';
    prfRowCounter = 0;

    // Set month from date range
    if (entries[0].date) {
        const d = new Date(entries[0].date + 'T00:00:00');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        document.getElementById('prfMonth').value = `${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }

    // Set employee signature
    document.getElementById('prfEmpSignature').value = employeeFilter;

    entries.forEach(entry => {
        // Format date as MM/DD/YY
        let dateStr = '';
        if (entry.date) {
            const d = new Date(entry.date + 'T00:00:00');
            dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
        }

        let explanation = '';
        if (entry.driveFrom && entry.driveTo) {
            explanation = `${entry.driveFrom}/${entry.driveTo}`;
        } else {
            explanation = entry.serviceType;
        }

        addPRFRow(dateStr, explanation, entry.clientName, entry.miles);
    });

    // Pad with empty rows
    const minRows = 20;
    for (let i = entries.length; i < minRows; i++) {
        addPRFRow();
    }

    recalcAllPRFRows();
}

// ========================================
// PRF GRID ROW MANAGEMENT
// ========================================

// Add a row to the PRF table
function addPRFRow(date, explanation, notes, miles) {
    const tbody = document.getElementById('prfTableBody');
    const row = document.createElement('tr');
    const idx = prfRowCounter;
    row.id = `prf-row-${idx}`;
    row.dataset.prfIndex = idx;

    date = date || '';
    explanation = explanation || '';
    notes = notes || '';
    miles = (miles !== undefined && miles !== null && miles !== 0) ? miles : '';

    row.innerHTML = `
        <td><input type="text" class="prf-input prf-input-date" id="prfDate-${idx}" value="${date}" placeholder="MM/DD/YY"></td>
        <td><input type="text" class="prf-input prf-input-explanation" id="prfExplanation-${idx}" value="${escapeHtml(explanation)}"></td>
        <td><input type="text" class="prf-input prf-input-notes" id="prfNotes-${idx}" value="${escapeHtml(notes)}"></td>
        <td><input type="number" class="prf-input prf-input-mileage" id="prfMileage-${idx}" value="${miles}" step="1" min="0" onchange="recalcPRFRow(${idx})" oninput="recalcPRFRow(${idx})"></td>
        <td class="prf-subtotal-cell" id="prfSubtotal-${idx}"></td>
        <td class="no-print"><button class="prf-row-delete-btn" onclick="deletePRFRow(${idx})" title="Delete row">&times;</button></td>
    `;

    tbody.appendChild(row);
    prfRowCounter++;

    // Calculate subtotal if miles provided
    if (miles) recalcPRFRow(idx);
}

// Escape HTML for safe insertion
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Delete a PRF row
function deletePRFRow(idx) {
    const row = document.getElementById(`prf-row-${idx}`);
    if (row) {
        row.remove();
        recalcPRFTotals();
    }
}

// Get current PRF mileage rate
function getPRFRate() {
    return parseFloat(document.getElementById('prfMileageRate').value) || PRF_MILEAGE_RATE_DEFAULT;
}

// Recalculate a single PRF row
function recalcPRFRow(idx) {
    const milesEl = document.getElementById(`prfMileage-${idx}`);
    const subtotalEl = document.getElementById(`prfSubtotal-${idx}`);
    if (!milesEl || !subtotalEl) return;

    const miles = parseFloat(milesEl.value) || 0;
    const rate = getPRFRate();
    const subtotal = miles * rate;

    subtotalEl.textContent = miles > 0 ? `$${subtotal.toFixed(2)}` : '';

    recalcPRFTotals();
}

// Recalculate all PRF rows and totals
function recalcAllPRFRows() {
    const rate = getPRFRate();

    // Update rate display in header
    document.getElementById('prfRateDisplay').textContent = `$${rate.toFixed(2)}`;

    // Recalc each row
    const tbody = document.getElementById('prfTableBody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const idx = row.dataset.prfIndex;
        if (idx !== undefined) recalcPRFRow(parseInt(idx));
    });
}

// Recalculate PRF totals
function recalcPRFTotals() {
    const tbody = document.getElementById('prfTableBody');
    const rows = tbody.querySelectorAll('tr');
    let totalMiles = 0;
    let totalSubtotal = 0;
    const rate = getPRFRate();

    rows.forEach(row => {
        const idx = row.dataset.prfIndex;
        if (idx === undefined) return;
        const milesEl = document.getElementById(`prfMileage-${idx}`);
        if (!milesEl) return;
        const miles = parseFloat(milesEl.value) || 0;
        totalMiles += miles;
        totalSubtotal += miles * rate;
    });

    const totalMileageEl = document.getElementById('prfTotalMileage');
    const totalSubtotalEl = document.getElementById('prfTotalSubtotal');

    totalMileageEl.textContent = totalMiles > 0 ? totalMiles.toString() : '';
    totalSubtotalEl.innerHTML = `<strong>$${totalSubtotal.toFixed(2)}</strong>`;
}

// Print PRF
function printPRF() {
    window.print();
}

// Export PRF grid to Excel
function exportPRFToExcel() {
    const wb = XLSX.utils.book_new();
    const month = document.getElementById('prfMonth').value || '';
    const empSig = document.getElementById('prfEmpSignature').value || '';
    const rate = getPRFRate();

    const data = [
        ['EPWORTH FAMILY RESOURCES'],
        ['MONTH', month],
        ['PERSONAL REIMBURSEMENT REQUEST'],
        [],
        ['DATE', 'EXPLANATION OF EXPENDITURE', 'NOTES', `Mileage X $${rate.toFixed(2)}`, 'Subtotal']
    ];

    const tbody = document.getElementById('prfTableBody');
    const rows = tbody.querySelectorAll('tr');
    let totalMiles = 0;
    let totalSubtotal = 0;

    rows.forEach(row => {
        const idx = row.dataset.prfIndex;
        if (idx === undefined) return;

        const date = (document.getElementById(`prfDate-${idx}`) || {}).value || '';
        const explanation = (document.getElementById(`prfExplanation-${idx}`) || {}).value || '';
        const notes = (document.getElementById(`prfNotes-${idx}`) || {}).value || '';
        const miles = parseFloat((document.getElementById(`prfMileage-${idx}`) || {}).value) || 0;
        const subtotal = miles * rate;

        if (date || explanation || notes || miles) {
            data.push([date, explanation, notes, miles || '', miles ? subtotal : '']);
            totalMiles += miles;
            totalSubtotal += subtotal;
        }
    });

    data.push([]);
    data.push(['Total', '', '', totalMiles, totalSubtotal]);
    data.push([]);
    data.push([empSig]);
    data.push(['Employee Signature, Title', '', 'Date']);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 12 }, { wch: 45 }, { wch: 40 }, { wch: 12 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'PRF');

    const safeName = (empSig || 'Staff').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `PRF_${safeName}_${month || 'report'}.xlsx`;
    XLSX.writeFile(wb, filename);
    alert(`PRF exported as "${filename}"`);
}
