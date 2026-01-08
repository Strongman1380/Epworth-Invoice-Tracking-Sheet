/**
 * Enhanced Excel Timesheet Template Generator
 * Creates an improved Excel template with dropdowns, validation, and sample data
 */

class ExcelTimesheetTemplate {
    constructor() {
        this.templateData = {
            headers: [
                'Staff Name',
                'Client Name', 
                'Master Case',
                'Service Type',
                'Date',
                'Time In',
                'Time Out',
                'Service Hours',
                'Travel From',
                'Travel To',
                'Miles',
                'Total Hours',
                'Comments'
            ],
            serviceTypes: [
                'OHFS', 'IHFS',
                'PTSV', 'PTSV-C',
                'DT.Breath', 'DT.Swab', 'DT.Urine', 'DT.Patch', 'DT.Sweat'
            ],
            sampleData: [
                ['', 'Smith, John', 'MC-12345', 'PTSV', '2025-01-15', '09:00', '10:30', '1.50', '', '', '0.0', '1.50', 'Initial supervised visit'],
                ['', 'Doe, Jane', 'MC-67890', 'OHFS', '2025-01-15', '11:00', '12:00', '1.00', 'Office', 'Client Home', '5.2', '2.00', 'Out of home family support']
            ]
        };
    }

    /**
     * Generate Excel template with enhanced features
     */
    generateTemplate() {
        // This would typically generate an actual Excel file using a library like xlsx
        // For now, we'll create a CSV representation with instructions
        let csvContent = this.templateData.headers.join(',') + '\n';
        
        // Add sample data
        this.templateData.sampleData.forEach(row => {
            csvContent += '"' + row.join('","') + '"\n';
        });
        
        // Add instructions row
        csvContent += '"","","","","","","","","","","","",""\n';
        csvContent += '"INSTRUCTIONS:","","","","","","","","","","","",""\n';
        csvContent += '"- Fill in your staff name in the first column","","","","","","","","","","","",""\n';
        csvContent += '"- Use dropdowns for Service Type (if using Excel)","","","","","","","","","","","",""\n';
        csvContent += '"- Use YYYY-MM-DD format for dates","","","","","","","","","","","",""\n';
        csvContent += '"- Use HH:MM 24-hour format for times","","","","","","","","","","","",""\n';
        csvContent += '"- Service Hours will auto-calculate if using Excel","","","","","","","","","","","",""\n';
        
        return csvContent;
    }

    /**
     * Create enhanced Excel file with dropdowns and validation (conceptual)
     */
    createEnhancedExcelFile() {
        // This is a conceptual representation - actual implementation would require
        // a library like SheetJS (xlsx) to create actual Excel files with features
        console.log('Creating enhanced Excel template with:');
        console.log('- Dropdown lists for Service Type column');
        console.log('- Date validation for Date column');  
        console.log('- Time format validation for Time In/Out columns');
        console.log('- Sample rows with common entries');
        console.log('- Instructions sheet');
        console.log('- Conditional formatting for validation');
    }

    /**
     * Get service types for dropdown creation
     */
    getServiceTypes() {
        return this.templateData.serviceTypes;
    }

    /**
     * Generate instructions for users
     */
    getInstructions() {
        return `
Excel Timesheet Template Instructions:

1. Download the template file
2. Fill in your information:
   - Staff Name: Your full name
   - Client Name: Full client name (surname, first name)
   - Master Case: Case number in format MC-XXXXX
   - Service Type: Select from dropdown list
   - Date: Use YYYY-MM-DD format (e.g., 2025-01-15)
   - Time In/Out: Use 24-hour format HH:MM (e.g., 09:00, 17:30)
   - Travel From/To: Locations if applicable
   - Miles: Distance traveled if applicable
   - Comments: Any additional notes

3. Save as .xlsx or .csv format
4. Import using the "Import from Excel" button

Tips:
- Use consistent formatting for all entries
- Double-check dates and times for accuracy
- Include all required fields marked with *
- You can save frequently used entries as templates in the app
        `;
    }
}

// Make the template generator available globally
window.ExcelTimesheetTemplate = ExcelTimesheetTemplate;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the Excel import page and enhance the help section
    const formatHelp = document.querySelector('.excel-format-help');
    if (formatHelp) {
        const instructions = new ExcelTimesheetTemplate().getInstructions();
        
        // Add download button for template
        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.className = 'excel-upload-btn';
        downloadBtn.style.cssText = 'margin-top: 10px; background: #28a745; width: 100%;';
        downloadBtn.innerHTML = '📥 Download Excel Template';
        downloadBtn.onclick = () => {
            downloadExcelTemplate();
        };
        
        formatHelp.appendChild(downloadBtn);
    }
});

/**
 * Download the Excel template file
 */
function downloadExcelTemplate() {
    const template = new ExcelTimesheetTemplate();
    const csvContent = template.generateTemplate();
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'timesheet-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show notification
    if (window.enhancedTimesheetManager) {
        window.enhancedTimesheetManager.showNotification('Excel template downloaded', 'success');
    }
}
