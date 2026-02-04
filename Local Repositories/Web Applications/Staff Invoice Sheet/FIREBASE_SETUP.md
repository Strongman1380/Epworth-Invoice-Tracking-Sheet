# Firebase Setup & Deployment Guide

## 📋 Your Firebase Project Details

- **Project Name:** Staff Invoice Sheet
- **Project ID:** `staff-invoice-sheet`
- **Project Number:** 94496038126
- **Support Email:** bhinrichs1380@gmail.com

---

## 🚀 Quick Deployment (5 Minutes)

### **Step 1: Get Your Web App Config**

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/staff-invoice-sheet/settings/general
   ```

2. **Scroll down to "Your apps" section**

3. **If no web app exists:**
   - Click "Add app" button
   - Select **Web** (</> icon)
   - App nickname: `Staff Invoice Web App`
   - ✅ Check "Also set up Firebase Hosting"
   - Click "Register app"

4. **Copy the firebaseConfig object** - it looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "staff-invoice-sheet.firebaseapp.com",
     projectId: "staff-invoice-sheet",
     storageBucket: "staff-invoice-sheet.appspot.com",
     messagingSenderId: "94496038126",
     appId: "1:94496038126:web:..."
   };
   ```

5. **Paste it into `firebase-config.js`** (replace the placeholder)

---

### **Step 2: Deploy to Firebase Hosting**

Open Terminal and run:

```bash
# Navigate to your project
cd "/Users/brandonhinrichs/Local Repositories/Web Applications/Staff Invoice Sheet"

# Login to Firebase (if not already)
firebase login

# Initialize Firebase (if needed)
firebase init hosting

# Select options:
# - Use existing project: staff-invoice-sheet
# - Public directory: . (current directory)
# - Configure as single-page app: No
# - Overwrite index.html: No

# Deploy!
firebase deploy

# Your app will be live at:
# https://staff-invoice-sheet.web.app
# https://staff-invoice-sheet.firebaseapp.com
```

---

## 🔐 Optional: Enable Firestore (Cloud Database)

If you want to store timesheets in the cloud instead of just localStorage:

### **Enable Firestore:**

1. Go to: https://console.firebase.google.com/project/staff-invoice-sheet/firestore
2. Click "Create Database"
3. Start in **Test Mode** (for development)
4. Choose location: `us-central` (or closest to you)
5. Click "Enable"

### **Set Up Security Rules:**

In Firestore Rules, use this configuration:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own timesheets
    match /timesheets/{timesheetId} {
      allow read, write: if request.auth != null;
    }

    // For test mode (public access - development only):
    // match /{document=**} {
    //   allow read, write: if true;
    // }
  }
}
```

### **Update firebase-config.js:**

Uncomment the Firestore code in `firebase-config.js` to enable cloud storage.

---

## 📊 Expected Costs

### **Free Tier Limits:**

**Hosting:**
- 10 GB storage
- 360 MB/day bandwidth
- Custom domain (optional)

**Firestore (if enabled):**
- 1 GB storage
- 50,000 document reads/day
- 20,000 document writes/day

**Your Usage:**
- HTML/CSS/JS files: < 1 MB
- Timesheet data: < 10 MB
- ~100-500 requests/month

**Cost: $0** (well within free tier)

---

## 🧪 Test Deployment Locally

Before deploying, test locally:

```bash
# Install Firebase CLI tools
npm install -g firebase-tools

# Serve locally
firebase serve

# Open in browser:
# http://localhost:5000
```

---

## 🌐 Your Live URLs (After Deployment)

- **Primary:** https://staff-invoice-sheet.web.app
- **Alternative:** https://staff-invoice-sheet.firebaseapp.com

Share these URLs with your staff to access the timesheet app!

---

## 🔄 Update Your App

When you make changes:

```bash
# Test locally first
firebase serve

# Deploy changes
firebase deploy

# Deploy only hosting (faster)
firebase deploy --only hosting
```

---

## 🎯 Post-Deployment Checklist

- [ ] App deployed successfully
- [ ] Test all features on live URL
- [ ] Google Maps distance calculation works
- [ ] Save/Load timesheet works
- [ ] Excel export works
- [ ] All dropdowns populate correctly
- [ ] Share URL with team

---

## 🔒 Security Best Practices

### **1. Restrict Google Maps API Key:**
- Go to: https://console.cloud.google.com/apis/credentials
- Add your Firebase domains to HTTP referrers:
  ```
  https://staff-invoice-sheet.web.app/*
  https://staff-invoice-sheet.firebaseapp.com/*
  ```

### **2. Set Up Firestore Rules:**
- Never leave Firestore in "Test Mode" for production
- Use authentication or at minimum, add validation rules

### **3. Monitor Usage:**
- Check Firebase Console regularly
- Set up budget alerts in Google Cloud
- Monitor API key usage

---

## 📞 Support & Resources

**Firebase Documentation:**
- Hosting: https://firebase.google.com/docs/hosting
- Firestore: https://firebase.google.com/docs/firestore

**Your Firebase Console:**
- Project Overview: https://console.firebase.google.com/project/staff-invoice-sheet
- Hosting: https://console.firebase.google.com/project/staff-invoice-sheet/hosting
- Firestore: https://console.firebase.google.com/project/staff-invoice-sheet/firestore

**Support:**
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: https://stackoverflow.com/questions/tagged/firebase

---

## 🐛 Troubleshooting

### **Issue: "firebase: command not found"**
```bash
npm install -g firebase-tools
```

### **Issue: "Permission denied"**
```bash
firebase login
```

### **Issue: "Project not found"**
- Check `.firebaserc` has correct project ID: `staff-invoice-sheet`
- Run: `firebase use staff-invoice-sheet`

### **Issue: "Build failed"**
- This is a static site, no build needed
- Make sure public directory is `.` (current directory)

---

## 📱 Custom Domain (Optional)

To use your own domain (e.g., `timesheet.epworth.org`):

1. Go to: https://console.firebase.google.com/project/staff-invoice-sheet/hosting
2. Click "Add custom domain"
3. Follow DNS configuration steps
4. Wait for SSL certificate (automatic, ~24 hours)

---

**Last Updated:** February 2026
**Status:** Ready for deployment
**Next Step:** Get Firebase web config and deploy!
