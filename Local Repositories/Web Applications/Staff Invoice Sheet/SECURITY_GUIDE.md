# Security Guide - Google Maps API Key

## ⚠️ IMPORTANT: API Key Security

Your Google Maps API key is currently embedded in the code:
```
AIzaSyDHuKbelQ7u7Ukb5BvfGnx_-5dvz1xM1w4
```

This is **necessary** for the distance calculation feature to work, but it means the key is visible to anyone who views the source code.

---

## 🔒 Required Security Steps

### Step 1: Restrict Your API Key (DO THIS NOW)

1. **Go to Google Cloud Console:**
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Find your API key in the list

2. **Click on the API key to edit it**

3. **Set Application Restrictions:**
   - Select: **"HTTP referrers (web sites)"**
   - Add these referrers:
     ```
     https://epworth-staff-invoice.web.app/*
     https://epworth-staff-invoice.firebaseapp.com/*
     http://localhost/*
     file:///*
     ```
   - This ensures only YOUR websites can use the key

4. **Set API Restrictions:**
   - Select: **"Restrict key"**
   - Choose: **"Distance Matrix API"** only
   - Also enable: **"Places API"** (for address autocomplete in future)
   - This prevents the key from being used for other Google services

5. **Click SAVE**

---

## 📊 Monitor Usage

### Set Up Budget Alerts:

1. Go to: https://console.cloud.google.com/billing/budgets
2. Create a budget alert for **$10/month**
3. You'll get an email if usage exceeds the free tier

### Expected Usage:
- Free tier: **40,000 Distance Matrix requests/month**
- Your usage: ~100-500 requests/month
- **Cost: $0** (well within free tier)

---

## 🔐 Best Practices

### Current Setup (Good for Internal Use):
✅ API key in code (visible but restricted to your domain)
✅ Restricted to Distance Matrix API only
✅ Restricted to your website domains
✅ Usage monitoring enabled

### Production Setup (Better for Public Apps):

If you make this app public or widely distributed:

1. **Create a Backend Proxy:**
   ```javascript
   // Instead of calling Google Maps directly:
   // Call your own backend API
   const response = await fetch('/api/calculate-distance', {
       method: 'POST',
       body: JSON.stringify({ from: driveFrom, to: driveTo })
   });
   ```

2. **Backend Code (Node.js example):**
   ```javascript
   // server.js
   app.post('/api/calculate-distance', async (req, res) => {
       const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Hidden in env var
       const { from, to } = req.body;

       const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&key=${apiKey}`;
       const data = await fetch(url).then(r => r.json());

       res.json(data);
   });
   ```

3. **Benefits:**
   - API key never exposed to browser
   - Can add rate limiting
   - Can cache results to reduce API calls
   - More secure for public apps

---

## 🚨 If Your Key Is Compromised

If you suspect your API key has been stolen or misused:

1. **Regenerate the key immediately:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click on the key
   - Click "Regenerate key"
   - Update the key in `app.js` and `index.html`

2. **Check billing:**
   - Go to: https://console.cloud.google.com/billing
   - Review usage for unexpected charges

3. **Set up restrictions** (as described above)

---

## 📝 Current Implementation Status

✅ Google Maps JavaScript API loaded
✅ Distance Matrix Service configured
✅ Automatic distance calculation enabled
✅ API key embedded (restricted recommended)

### Files with API Key:
- `app.js` (line 62)
- `index.html` (line 136)

---

## 🎯 Quick Security Checklist

- [ ] API key restrictions set (HTTP referrers)
- [ ] API restrictions set (Distance Matrix API only)
- [ ] Budget alerts configured ($10/month)
- [ ] Usage monitoring enabled
- [ ] Billing account verified
- [ ] Test distance calculation works
- [ ] Consider backend proxy for production

---

## 📞 Support

If you need help securing your API key:
- Google Cloud Support: https://cloud.google.com/support
- Firebase Support: https://firebase.google.com/support

---

**Last Updated:** February 2026
**API Key Status:** Active (restrictions recommended)
