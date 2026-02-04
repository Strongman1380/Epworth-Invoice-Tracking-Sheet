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
    'FS.OH',
    'PT',
    'PT.health',
    'DT.Swab',
    'DT.Urine',
    'DT.Other',
    'DT.Sweat'
];

// Staff Names (can be customized)
const STAFF_NAMES = [
    '',
    'Brandon Hinrichs',
    'Raquel Dean',
    'Crystal Kucklish',
    'Amanda Schopfler',
    'Tawny Gebhard'
];

// Client Names with Case Numbers
const CLIENTS = {
    '': '',
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
function saveAddress(addressString, placeData = null) {
    const addresses = getSavedAddresses();

    // Check if address already exists
    const existingIndex = addresses.findIndex(addr => addr.address === addressString);

    if (existingIndex >= 0) {
        // Update existing address
        addresses[existingIndex].usageCount = (addresses[existingIndex].usageCount || 0) + 1;
        addresses[existingIndex].lastUsed = getCurrentTimestamp();
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
            createdAt: getCurrentTimestamp()
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

            // Save the address to storage
            saveAddress(address, placeData);

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
function populateAddressDatalist() {
    const addresses = getAddressesSorted();
    const datalist = document.getElementById('addressList');

    if (datalist) {
        datalist.innerHTML = addresses.map(addr =>
            `<option value="${addr.address}">`
        ).join('');
    }
}

// Save address when user manually types (on blur)
function saveAddressOnBlur(inputElement) {
    const address = inputElement.value.trim();
    if (address) {
        saveAddress(address);
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

    container.innerHTML = addresses.map(addr => `
        <div class="address-item">
            <div class="address-item-content">
                <div class="address-text">${addr.address}</div>
                <div class="address-meta">
                    Used ${addr.usageCount} ${addr.usageCount === 1 ? 'time' : 'times'}
                    • Last used: ${new Date(addr.lastUsed).toLocaleDateString()}
                </div>
            </div>
            <button onclick="deleteAddressFromManager('${addr.id}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
    `).join('');
}

// Delete address from manager
function deleteAddressFromManager(id) {
    if (confirm('Are you sure you want to delete this address?')) {
        deleteAddress(id);
        populateAddressDatalist();
        renderAddressManager();
    }
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
    cellDriveFrom.innerHTML = `<input type="text" id="driveFrom-${rowCounter}" data-col="driveFrom" list="addressList" placeholder="From Address" onblur="saveAddressOnBlur(this); calculateDistance(${rowCounter})">`;

    // Column J: Drive To Address
    const cellDriveTo = row.insertCell();
    cellDriveTo.innerHTML = `<input type="text" id="driveTo-${rowCounter}" data-col="driveTo" list="addressList" placeholder="To Address" onblur="saveAddressOnBlur(this); calculateDistance(${rowCounter})">`;

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
// DASHBOARD FUNCTIONS
// ========================================

// Show dashboard view
function showDashboard() {
    document.getElementById('dashboardView').classList.add('active');
    document.getElementById('timesheetEditorView').classList.remove('active');
    document.getElementById('dashboardTab').classList.add('active');
    document.getElementById('timesheetTab').classList.remove('active');

    renderDashboard();
}

// Show timesheet editor view
function showTimesheetEditor(timesheetId = null) {
    document.getElementById('dashboardView').classList.remove('active');
    document.getElementById('timesheetEditorView').classList.add('active');
    document.getElementById('dashboardTab').classList.remove('active');
    document.getElementById('timesheetTab').classList.add('active');

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

// Export to Excel using SheetJS
function exportToExcel() {
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
