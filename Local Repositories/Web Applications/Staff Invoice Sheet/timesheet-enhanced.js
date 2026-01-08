/**
 * Enhanced Timesheet Module for Staff Invoice Sheet
 * Improves usability with auto-save, smart defaults, and quick entry features
 */

class EnhancedTimesheetManager {
    constructor() {
        this.autoSaveTimer = null;
        this.templates = this.loadTemplates();
        this.clientHistory = this.loadClientHistory();
        this.serviceHistory = this.loadServiceHistory();
        this.lastEntry = this.loadLastEntry();
    }

    /**
     * Initialize enhanced timesheet functionality
     */
    initialize() {
        this.enableAutoSave();
        this.setupSmartDefaults();
        this.setupKeyboardShortcuts();
        this.setupQuickActions();
        this.setupTemplateSystem();
        this.setupValidationEnhancements();
        console.log('Enhanced Timesheet Manager initialized');
    }

    /**
     * Enable auto-save functionality to prevent data loss
     */
    enableAutoSave() {
        // Auto-save when leaving fields
        document.addEventListener('focusout', (event) => {
            if (event.target.closest('#instancesContainer') && 
                (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA')) {
                this.scheduleAutoSave();
            }
        });

        // Periodic auto-save every 30 seconds
        setInterval(() => {
            this.saveCurrentFormState();
        }, 30000);
    }

    /**
     * Schedule auto-save with debounce
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveCurrentFormState();
        }, 1000); // Save 1 second after user stops typing
    }

    /**
     * Save current form state to localStorage
     */
    saveCurrentFormState() {
        try {
            const formData = this.captureFormData();
            localStorage.setItem('timesheetDraft', JSON.stringify(formData));
            this.showNotification('Draft saved automatically', 'success');
        } catch (error) {
            console.warn('Failed to auto-save form:', error);
        }
    }

    /**
     * Capture current form data
     */
    captureFormData() {
        const instancesContainer = document.getElementById('instancesContainer');
        if (!instancesContainer) return null;

        const instances = [];
        const instanceElements = instancesContainer.querySelectorAll('.service-instance');
        
        instanceElements.forEach(element => {
            const instance = {};
            const inputs = element.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                if (input.name) {
                    instance[input.name] = input.value;
                }
            });
            
            instances.push(instance);
        });

        return {
            instances,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Restore form data from localStorage
     */
    restoreFormData() {
        try {
            const savedData = localStorage.getItem('timesheetDraft');
            if (!savedData) return false;

            const formData = JSON.parse(savedData);
            const instancesContainer = document.getElementById('instancesContainer');
            
            if (!instancesContainer || !formData.instances) return false;

            // Clear existing instances
            instancesContainer.innerHTML = '';

            // Restore each instance
            formData.instances.forEach(instanceData => {
                const newInstanceElement = this.createInstanceElement(instanceData);
                instancesContainer.appendChild(newInstanceElement);
            });

            this.showNotification('Previous draft restored', 'info');
            return true;
        } catch (error) {
            console.warn('Failed to restore form data:', error);
            return false;
        }
    }

    /**
     * Create instance element from data
     */
    createInstanceElement(instanceData) {
        const container = document.createElement('div');
        container.className = 'service-instance';
        container.innerHTML = `
            <div class="instance-row">
                <input type="text" name="clientName" value="\${instanceData.clientName || ''}" placeholder="Client Name" class="auto-complete">
                <input type="text" name="masterCase" value="\${instanceData.masterCase || ''}" placeholder="Master Case" class="auto-complete">
                <select name="serviceType" class="auto-complete">
                    <option value="">Select Service Type</option>
                    <option value="OHFS" \${instanceData.serviceType === 'OHFS' ? 'selected' : ''}>OHFS - Out of Home Family Support</option>
                    <option value="IHFS" \${instanceData.serviceType === 'IHFS' ? 'selected' : ''}>IHFS - In Home Family Support</option>
                    <option value="PTSV" \${instanceData.serviceType === 'PTSV' ? 'selected' : ''}>PTSV - Parenting Time Supervised Visitation</option>
                    <option value="PTSV-C" \${instanceData.serviceType === 'PTSV-C' ? 'selected' : ''}>PTSV-C - Parenting Time Supervision with Coaching</option>
                    <option value="DT.Breath" \${instanceData.serviceType === 'DT.Breath' ? 'selected' : ''}>Drug Testing - Breath</option>
                    <option value="DT.Swab" \${instanceData.serviceType === 'DT.Swab' ? 'selected' : ''}>Drug Testing - Swab</option>
                    <option value="DT.Urine" \${instanceData.serviceType === 'DT.Urine' ? 'selected' : ''}>Drug Testing - Urine</option>
                    <option value="DT.Patch" \${instanceData.serviceType === 'DT.Patch' ? 'selected' : ''}>Drug Testing - Patch</option>
                    <option value="DT.Sweat" \${instanceData.serviceType === 'DT.Sweat' ? 'selected' : ''}>Drug Testing - Sweat</option>
                </select>
                <input type="date" name="date" value="\${instanceData.date || ''}" class="date-input">
                <input type="time" name="serviceTimeIn" value="\${instanceData.serviceTimeIn || ''}" placeholder="Time In" class="time-input">
                <input type="time" name="serviceTimeOut" value="\${instanceData.serviceTimeOut || ''}" placeholder="Time Out" class="time-input">
                <input type="number" step="0.01" name="serviceBillableHours" value="\${instanceData.serviceBillableHours || ''}" placeholder="Hours" readonly>
                <input type="text" name="travelToFrom" value="\${instanceData.travelToFrom || ''}" placeholder="Travel From" class="auto-complete">
                <input type="text" name="travelToDestination" value="\${instanceData.travelToDestination || ''}" placeholder="Travel To" class="auto-complete">
                <input type="number" step="0.1" name="travelToMiles" value="\${instanceData.travelToMiles || ''}" placeholder="Miles">
                <textarea name="comments" placeholder="Comments">\${instanceData.comments || ''}</textarea>
                <button type="button" class="remove-instance-btn" onclick="removeInstance(this)">Remove</button>
            </div>
        `;

        // Add auto-calculate for hours
        this.setupHourCalculation(container);
        return container;
    }

    /**
     * Setup hour calculation for an instance
     */
    setupHourCalculation(instanceElement) {
        const timeIn = instanceElement.querySelector('input[name="serviceTimeIn"]');
        const timeOut = instanceElement.querySelector('input[name="serviceTimeOut"]');
        const hoursField = instanceElement.querySelector('input[name="serviceBillableHours"]');

        if (timeIn && timeOut && hoursField) {
            const calculateHours = () => {
                if (timeIn.value && timeOut.value) {
                    const hours = this.calculateHours(timeIn.value, timeOut.value);
                    hoursField.value = hours.toFixed(2);
                } else {
                    hoursField.value = '';
                }
            };

            timeIn.addEventListener('change', calculateHours);
            timeOut.addEventListener('change', calculateHours);
        }
    }

    /**
     * Setup smart defaults for new entries
     */
    setupSmartDefaults() {
        // Pre-fill date with current date
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-instance-btn')) {
                setTimeout(() => {
                    const newDateInput = document.querySelectorAll('input[name="date"]:not([data-default-set])');
                    if (newDateInput.length > 0) {
                        const lastDateInput = newDateInput[newDateInput.length - 1];
                        if (!lastDateInput.value) {
                            lastDateInput.value = new Date().toISOString().split('T')[0];
                            lastDateInput.setAttribute('data-default-set', 'true');
                        }
                    }
                    
                    // Set focus to first field of new instance
                    const newInputs = document.querySelectorAll('.service-instance:last-of-type input');
                    if (newInputs.length > 0) {
                        newInputs[0].focus();
                    }
                }, 100);
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Enter to add new entry
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                const addBtn = document.querySelector('.add-instance-btn');
                if (addBtn) addBtn.click();
            }
            
            // Escape to close modals
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('[id$="Modal"]');
                modals.forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }

    /**
     * Setup quick actions bar
     */
    setupQuickActions() {
        // Create quick actions bar if it doesn't exist
        if (!document.getElementById('quick-actions-bar')) {
            const quickActionsHTML = `
                <div id="quick-actions-bar" style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                    display: flex;
                    gap: 10px;
                    flex-direction: column;
                    align-items: flex-end;
                ">
                    <button id="quick-add-btn" title="Add New Entry (Ctrl+Enter)" style="
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        background: #2c5aa0;
                        color: white;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">+</button>
                    
                    <button id="quick-import-btn" title="Import from Excel" style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: #28a745;
                        color: white;
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">📊</button>
                    
                    <button id="quick-save-btn" title="Save Draft" style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: #ffc107;
                        color: black;
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">💾</button>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', quickActionsHTML);
            
            // Add event listeners
            document.getElementById('quick-add-btn').addEventListener('click', () => {
                const addBtn = document.querySelector('.add-instance-btn');
                if (addBtn) addBtn.click();
            });
            
            document.getElementById('quick-import-btn').addEventListener('click', () => {
                // Trigger Excel import
                if (window.excelImportManager) {
                    window.excelImportManager.openModal();
                } else if (window.unifiedExcelImportManager) {
                    window.unifiedExcelImportManager.openModal();
                } else {
                    // Fallback to existing import button
                    const importBtn = document.querySelector('button[onclick*="openExcelImport"]');
                    if (importBtn) importBtn.click();
                }
            });
            
            document.getElementById('quick-save-btn').addEventListener('click', () => {
                this.saveCurrentFormState();
                this.showNotification('Draft saved manually', 'success');
            });
        }
    }

    /**
     * Setup template system
     */
    setupTemplateSystem() {
        // Add template functionality
        this.setupTemplateButtons();
        this.setupTemplateManagement();
    }

    /**
     * Setup template buttons
     */
    setupTemplateButtons() {
        // Add template selector to form view
        const formView = document.getElementById('formView');
        if (formView) {
            const templateSelector = document.createElement('div');
            templateSelector.id = 'template-selector';
            templateSelector.style.cssText = `
                margin: 10px 0;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            `;
            templateSelector.innerHTML = `
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Quick Templates:</label>
                <select id="template-select" style="width: 100%; padding: 8px; margin-bottom: 5px;">
                    <option value="">Select a template...</option>
                </select>
                <button type="button" id="apply-template-btn" style="width: 100%; padding: 8px; background: #2c5aa0; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Template</button>
                <button type="button" id="save-template-btn" style="width: 100%; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 5px;">Save as Template</button>
            `;
            
            const addButton = formView.querySelector('.add-instance-btn');
            if (addButton) {
                addButton.parentNode.insertBefore(templateSelector, addButton);
            }
            
            // Add event listeners
            document.getElementById('apply-template-btn').addEventListener('click', () => {
                this.applyTemplate();
            });
            
            document.getElementById('save-template-btn').addEventListener('click', () => {
                this.saveCurrentAsTemplate();
            });
            
            // Populate template options
            this.populateTemplateOptions();
        }
    }

    /**
     * Load templates from localStorage
     */
    loadTemplates() {
        try {
            const stored = localStorage.getItem('timesheetTemplates');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load templates:', error);
            return {};
        }
    }

    /**
     * Save templates to localStorage
     */
    saveTemplates() {
        try {
            localStorage.setItem('timesheetTemplates', JSON.stringify(this.templates));
        } catch (error) {
            console.warn('Failed to save templates:', error);
        }
    }

    /**
     * Populate template options in dropdown
     */
    populateTemplateOptions() {
        const select = document.getElementById('template-select');
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add template options
        Object.keys(this.templates).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    /**
     * Apply selected template
     */
    applyTemplate() {
        const select = document.getElementById('template-select');
        if (!select || !select.value) return;
        
        const template = this.templates[select.value];
        if (!template) return;
        
        // Create new instance with template data
        const addBtn = document.querySelector('.add-instance-btn');
        if (addBtn) {
            addBtn.click(); // Add new instance
            
            // Wait for new instance to be created, then populate
            setTimeout(() => {
                const newInstances = document.querySelectorAll('.service-instance');
                const newInstance = newInstances[newInstances.length - 1]; // Last instance
                
                // Populate fields with template data
                Object.entries(template).forEach(([fieldName, value]) => {
                    if (fieldName !== 'name') { // Skip the template name
                        const input = newInstance.querySelector(\`[name="\${fieldName}"]\`);
                        if (input) {
                            input.value = value;
                            
                            // Trigger change event for validation/calculation
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                });
                
                this.showNotification(\`Applied template: \${select.value}\`, 'success');
            }, 100);
        }
    }

    /**
     * Save current entry as template
     */
    saveCurrentAsTemplate() {
        const instances = document.querySelectorAll('.service-instance');
        if (instances.length === 0) {
            this.showNotification('No entries to save as template', 'warning');
            return;
        }
        
        const lastInstance = instances[instances.length - 1]; // Use last instance
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        const template = {};
        const inputs = lastInstance.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name) {
                template[input.name] = input.value;
            }
        });
        
        template.name = templateName;
        this.templates[templateName] = template;
        this.saveTemplates();
        this.populateTemplateOptions();
        
        this.showNotification(\`Template saved: \${templateName}\`, 'success');
    }

    /**
     * Setup validation enhancements
     */
    setupValidationEnhancements() {
        // Add real-time validation
        document.addEventListener('input', (event) => {
            if (event.target.closest('#instancesContainer')) {
                this.validateField(event.target);
            }
        });
        
        // Add hour calculation
        this.setupHourCalculations();
    }

    /**
     * Setup hour calculations
     */
    setupHourCalculations() {
        // Add event listeners to time inputs
        document.addEventListener('change', (event) => {
            if ((event.target.name === 'serviceTimeIn' || event.target.name === 'serviceTimeOut') && 
                event.target.closest('.service-instance')) {
                
                this.calculateHoursForInstance(event.target.closest('.service-instance'));
            }
        });
    }

    /**
     * Calculate hours for a specific instance
     */
    calculateHoursForInstance(instanceElement) {
        const timeIn = instanceElement.querySelector('input[name="serviceTimeIn"]');
        const timeOut = instanceElement.querySelector('input[name="serviceTimeOut"]');
        const hoursField = instanceElement.querySelector('input[name="serviceBillableHours"]');
        
        if (!timeIn || !timeOut || !hoursField) return;
        
        if (timeIn.value && timeOut.value) {
            const hours = this.calculateHours(timeIn.value, timeOut.value);
            hoursField.value = hours.toFixed(2);
        } else {
            hoursField.value = '';
        }
    }

    /**
     * Calculate hours between two time strings
     */
    calculateHours(timeIn, timeOut) {
        if (!timeIn || !timeOut) return 0;
        
        const [inHour, inMin] = timeIn.split(':').map(Number);
        const [outHour, outMin] = timeOut.split(':').map(Number);
        
        const startMinutes = inHour * 60 + inMin;
        const endMinutes = outHour * 60 + outMin;
        let totalMinutes = endMinutes - startMinutes;
        
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
        
        return totalMinutes / 60;
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        let isValid = true;
        let errorMessage = '';
        
        switch (input.name) {
            case 'date':
                if (input.value && !this.isValidDate(input.value)) {
                    isValid = false;
                    errorMessage = 'Invalid date format';
                }
                break;
                
            case 'serviceTimeIn':
            case 'serviceTimeOut':
                if (input.value && !this.isValidTime(input.value)) {
                    isValid = false;
                    errorMessage = 'Invalid time format (HH:MM)';
                }
                break;
                
            case 'serviceBillableHours':
                if (input.value && (isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0)) {
                    isValid = false;
                    errorMessage = 'Hours must be a positive number';
                }
                break;
                
            case 'travelToMiles':
                if (input.value && (isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0)) {
                    isValid = false;
                    errorMessage = 'Miles must be a positive number';
                }
                break;
        }
        
        // Show validation feedback
        if (!isValid) {
            input.style.borderColor = '#dc3545';
            input.title = errorMessage;
        } else {
            input.style.borderColor = '';
            input.title = '';
        }
    }

    /**
     * Check if date is valid
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Check if time is valid (HH:MM format)
     */
    isValidTime(timeString) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.enhanced-notification');
        if (existing) existing.remove();
        
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        
        const notification = document.createElement('div');
        notification.className = 'enhanced-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: \${colors[type]};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .auto-complete {
        position: relative;
    }
    
    .auto-complete-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: white;
        border: 1px solid #ccc;
        border-top: none;
        z-index: 100;
        max-height: 150px;
        overflow-y: auto;
    }
    
    .auto-complete-option {
        padding: 8px;
        cursor: pointer;
    }
    
    .auto-complete-option:hover {
        background: #f0f0f0;
    }
`;
document.head.appendChild(style);

// Initialize the enhanced timesheet manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const enhancedManager = new EnhancedTimesheetManager();
    enhancedManager.initialize();
    
    // Restore any saved draft
    setTimeout(() => {
        enhancedManager.restoreFormData();
    }, 500);
    
    // Make it globally accessible
    window.enhancedTimesheetManager = enhancedManager;
});
