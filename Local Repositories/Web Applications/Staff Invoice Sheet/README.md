# Epworth Staff Invoice & Timesheet System

An interactive web-based timesheet application that replicates the functionality of an Excel-based staff invoice system with automatic calculations, Google Maps integration, and Excel export capabilities.

## Features

✅ **Interactive Spreadsheet Grid**
- Matches the exact layout of the original Excel timesheet
- Pink header row, yellow calculated cells, and proper formatting

✅ **Dropdown Menus**
- Service Types (Travel-PT, Travel-PT-Kids, Travel-FS-IH, Travel-FS-OH, Travel-DT, FS.IH, FS.OH, PT, PT.health, DT.Swab, DT.Urine, DT.Other, DT.Sweat)
- Staff Names
- Paid Leave Types (V=Vacation, S=Sick, H=Holiday)

✅ **Date & Time Pickers**
- HTML5 date picker for service dates
- Time pickers for Time In/Time Out

✅ **Automatic Calculations**
- **Billable Hours**: Calculates hours worked from Time In/Out
- **Transport Bill Time**: Auto-calculates for travel service types
- **Total Mileage**: Odometer Stop - Odometer Start
- **Indirect Hours**: Sum of Paid Hours + Meeting + Training + Doc Time
- **Drive Total**: Transport Bill Time + Drive Non-Bill
- **Daily Total**: Sum of all hour categories
- **Mileage Reimbursement**: (Total Mileage - Adjustment) × $0.545/mile

✅ **Google Maps Integration** (Optional)
- Automatic distance calculation between addresses
- Uses Google Maps Distance Matrix API

✅ **Save & Load Functionality**
- Save timesheets to browser localStorage
- Load previously saved timesheets
- Multiple staff member support

✅ **Excel Export**
- Export to .xlsx format using SheetJS library
- Maintains all data and formatting
- Ready for payroll processing

✅ **Row Management**
- Add new entries
- Duplicate existing entries
- Delete entries
- Real-time totals update

## Getting Started

### Option 1: Local Development

1. **Clone or download this repository**

2. **Open `index.html` in a web browser**
   ```bash
   open index.html
   ```
   or simply double-click the file.

3. **Start entering timesheet data!**

### Option 2: Deploy to Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done)
   ```bash
   firebase init
   ```
   - Select "Hosting"
   - Select your project: `epworth-staff-invoice`
   - Public directory: `.` (current directory)
   - Configure as single-page app: No
   - Overwrite index.html: No

4. **Deploy**
   ```bash
   firebase deploy
   ```

5. **Access your app**
   - Your app will be live at: `https://epworth-staff-invoice.web.app`

## Setting Up Google Maps API (Optional)

To enable automatic distance calculation:

1. **Get a Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Distance Matrix API"
   - Create credentials (API Key)
   - Restrict the key to your domain

2. **Enter the API Key**
   - When you first load the app, you'll be prompted for the API key
   - Or manually enter it in the browser console:
     ```javascript
     localStorage.setItem('googleMapsApiKey', 'YOUR_API_KEY_HERE');
     ```

**Note:** For production use, you should create a backend proxy to protect your API key from being exposed in the browser.

## Usage Guide

### 1. Enter Employee Information

Fill in the header section:
- Employee Name
- Supervisor Name
- Pay Period (e.g., "Jan. 24th, 2026")

### 2. Add Timesheet Entries

Click **"+ Add Entry"** or use the pre-filled rows.

For each entry, fill in:

**Required Fields:**
- **Service Type** (dropdown): Select the type of service
- **Date**: Select the service date
- **Time In/Out**: Enter start and end times
- **Staff Name** (dropdown): Select staff initials

**Optional Fields:**
- **Service Choice**: Additional service details
- **Travel Comments**: Notes about travel
- **Client Name**: Last Name, First Name format
- **Master Case #**: Case number
- **Drive From/To**: Addresses for distance calculation
- **Paid Hours, Meeting Hours, Training Hours, Doc Time**: Manual entry
- **Odometer Start/Stop**: For mileage tracking

**Auto-Calculated Fields (Yellow background):**
- Miles (if Google Maps API is configured)
- Transport Bill Time
- Billable Hours
- Total Mileage
- Indirect Hours
- Drive Total
- Daily Total
- Mileage Reimbursement

### 3. Save Your Timesheet

Click **"Save Timesheet"** to store the data locally.

### 4. Load a Saved Timesheet

Click **"Load Timesheet"** to retrieve the last saved timesheet.

### 5. Export to Excel

Click **"Export to Excel"** to download an .xlsx file that matches the original Excel format.

### 6. Manage Rows

- **Copy**: Duplicate a row with all data
- **Delete**: Remove a row
- **Add Entry**: Add a new blank row

## Formulas Reference

### Transport Bill Time (Column Q)
```javascript
IF service type includes "Travel" AND timeIn AND timeOut exist:
    transportBillTime = timeOut - timeIn (in hours)
ELSE:
    transportBillTime = 0
```

### Billable Hours (Column X)
```javascript
IF timeIn AND timeOut exist:
    billableHours = timeOut - timeIn (in hours)
    // Handles overnight shifts automatically
ELSE:
    billableHours = 0
```

### Total Mileage (Column W)
```javascript
totalMileage = odometerStop - odometerStart
```

### Indirect Hours (Column Z)
```javascript
indirectHours = paidHours + meetingHours + trainingHours + docTime
```

### Drive Total (Column AA)
```javascript
driveTotal = transportBillTime + driveNonBill
```

### Daily Total (Column AB)
```javascript
dailyTotal = paidHours + meetingHours + trainingHours + docTime + billableHours + driveNonBill
```

### Mileage Reimbursement (Column AC)
```javascript
mileageReimb = (totalMileage - mileageAdjustment) × $0.545
```

## File Structure

```
Staff Invoice Sheet/
├── index.html              # Main HTML structure
├── styles.css              # Styling (matches Excel appearance)
├── app.js                  # Main JavaScript logic
├── firebase-config.js      # Firebase configuration (optional)
├── .firebaserc            # Firebase project config
├── firebase.json          # Firebase hosting config
└── README.md              # This file
```

## Customization

### Adding Staff Members

Edit `app.js`, line ~22:
```javascript
const STAFF_NAMES = [
    '',
    'Brandon Hinrichs',
    'Raquel Dean',
    'Crystal Kucklish',
    'Amanda Schopfler',
    'Tawny Gebhard',
    'Your Name Here'  // Add additional staff here
];
```

### Adding Service Types

Edit `app.js`, line ~5:
```javascript
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
    'DT.Sweat',
    'Your-New-Service-Type'  // Add custom types here
];
```

### Changing Mileage Rate

Edit `app.js`, line ~2:
```javascript
const MILEAGE_RATE = 0.545; // Change to your rate
```

## Browser Compatibility

✅ Chrome (Recommended)
✅ Firefox
✅ Safari
✅ Edge

**Note:** Requires modern browser with HTML5 support for date/time pickers.

## Data Storage

### LocalStorage (Current Implementation)
- Data is stored in the browser's localStorage
- Persists across sessions
- Limited to ~5-10MB
- Data is local to each device/browser

### Firebase (Optional Upgrade)
- Uncomment code in `firebase-config.js`
- Add your Firebase credentials
- Enables cloud storage and multi-device sync

## Known Limitations

1. **Google Maps Distance Calculation**
   - Requires API key
   - May fail due to CORS in browser
   - Recommended to use backend proxy in production

2. **LocalStorage Limits**
   - Storage is limited to ~5-10MB
   - Data is device-specific
   - Consider Firebase for multi-device access

3. **Excel Export**
   - Exports data but may not preserve all Excel formatting
   - Formulas are exported as values, not formulas

## Troubleshooting

### Distance calculation not working
- Check that Google Maps API key is entered
- Verify API key has Distance Matrix API enabled
- Check browser console for errors
- May need backend proxy for production

### Timesheet not saving
- Check browser console for errors
- Verify localStorage is enabled
- Try clearing browser cache
- Check storage quota

### Excel export not working
- Ensure SheetJS library is loaded
- Check browser console for errors
- Try a different browser

## Future Enhancements

- [ ] Firebase Firestore integration for cloud storage
- [ ] User authentication system
- [ ] Supervisor approval workflow
- [ ] Email notifications
- [ ] Mobile app (iOS/Android)
- [ ] Offline mode with sync
- [ ] Backend API for Google Maps distance calculation
- [ ] Advanced reporting and analytics
- [ ] Multiple timesheet templates
- [ ] PDF export option

## Support

For issues or questions, please contact the development team or submit an issue on GitHub.

## License

Copyright © 2026 Epworth Village. All rights reserved.

---

**Version:** 9.8
**Last Updated:** February 2026
**Developed By:** Brandon Hinrichs
