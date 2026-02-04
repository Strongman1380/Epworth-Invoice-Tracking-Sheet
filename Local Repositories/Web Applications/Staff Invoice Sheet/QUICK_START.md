# Quick Start Guide

## 🚀 Get Started in 60 Seconds

### Step 1: Open the App
```bash
# Navigate to the project directory
cd "/Users/brandonhinrichs/Local Repositories/Web Applications/Staff Invoice Sheet"

# Open in your default browser
open index.html
```

Or simply **double-click** `index.html` in Finder.

---

## 📝 Basic Workflow

### 1. **Fill in Employee Info** (Top of page)
   - Employee Name: `Raquel Dean`
   - Supervisor: `Brandon Hinrichs`
   - Pay Period: `Jan. 24th, 2026`

### 2. **Add a Timesheet Entry**

Click **+ Add Entry** button (or use pre-filled rows)

**Example Entry:**
- Service Type: `Travel-PT` (dropdown)
- Client Name: `Doe, John`
- Date: `01/24/2026`
- Time In: `08:00`
- Time Out: `17:00`
- Drive From: `York, NE`
- Drive To: `Geneva, NE`
- Staff Name: `RD`

✨ **Watch the magic:**
- Billable Hours: Auto-calculates to `9.00`
- Transport Bill Time: Auto-calculates for travel types
- Daily Total: Updates in real-time
- Totals row at bottom updates automatically

### 3. **Save Your Timesheet**

Click **Save Timesheet** button
- Data saves to your browser (localStorage)
- Can be loaded later

### 4. **Export to Excel**

Click **Export to Excel** button
- Downloads `.xlsx` file
- Matches original Excel format
- Ready for payroll

---

## 🎯 Key Features to Try

### ✅ Automatic Calculations
- Enter **Time In** and **Time Out** → Billable Hours calculates
- Enter **Odometer Start/Stop** → Total Mileage calculates
- All totals update in real-time at the bottom

### ✅ Row Actions
- **Copy** button: Duplicate a row for repeated entries
- **Delete** button: Remove a row
- **Add Entry**: Add more rows anytime

### ✅ Data Persistence
- **Save**: Stores timesheet in browser
- **Load**: Retrieves last saved timesheet
- **Clear All**: Reset everything (with confirmation)

### ✅ Excel-Like Interface
- **Pink headers** (just like Excel)
- **Yellow calculated cells** (read-only)
- **Dropdown menus** for service types, staff names
- **Date/time pickers** for easy entry

---

## 🔧 Optional Setup

### Google Maps Distance Calculation

To enable automatic distance calculation:

1. Get a Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable "Distance Matrix API"
   - Create API Key

2. Enter the key when prompted (first time you load the app)

   OR

   Open browser console (F12) and run:
   ```javascript
   localStorage.setItem('googleMapsApiKey', 'YOUR_KEY_HERE');
   ```

---

## 🌐 Deploy Online (Optional)

### Firebase Hosting (Free)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy

# Your app will be live at:
# https://epworth-staff-invoice.web.app
```

---

## 💡 Pro Tips

1. **Duplicate Similar Entries**
   - Use the **Copy** button to duplicate rows
   - Great for repeated travel routes

2. **Keyboard Navigation**
   - Use **Tab** to move between fields
   - **Enter** to move to next row

3. **Save Frequently**
   - Click **Save Timesheet** periodically
   - Data persists in browser

4. **Export at End of Pay Period**
   - Click **Export to Excel**
   - Send file to payroll

5. **Multiple Staff Members**
   - Save each staff's timesheet separately
   - Name format: `Employee_PayPeriod`

---

## 📊 Example Complete Entry

| Field | Value |
|-------|-------|
| Service Type | Travel-PT |
| Client Name | Smith, Jane |
| Case # | 12345 |
| Date | 01/24/2026 |
| Time In | 09:00 AM |
| Time Out | 12:00 PM |
| Drive From | York, NE |
| Drive To | Geneva, NE |
| Staff Name | RD |

**Auto-Calculated Results:**
- Miles: 22 (if Google Maps enabled)
- Billable Hours: 3.00
- Transport Bill Time: 3.00
- Daily Total: 3.00

---

## 🆘 Troubleshooting

### Issue: Nothing saves when I click Save
**Solution:** Check browser console (F12) for errors. Try a different browser.

### Issue: Distance not calculating
**Solution:** Enter Google Maps API key (see Optional Setup above)

### Issue: Excel export not working
**Solution:** Make sure SheetJS library loaded. Check internet connection.

### Issue: Totals not updating
**Solution:** Click in/out of fields to trigger calculation. Refresh page.

---

## 📞 Need Help?

See the full [README.md](README.md) for detailed documentation.

---

## 🎉 You're Ready!

Start entering timesheet data and enjoy the automated calculations!

**Current Version:** 9.8
**Last Updated:** February 2026
