# Vercel Deployment Guide - Staff Invoice Sheet

## 🚀 Quick Deploy (5 Minutes)

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from this directory:**
   ```bash
   cd "/Users/brandonhinrichs/Local Repositories/Web Applications/Staff Invoice Sheet"
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? (Select your account)
   - Link to existing project? **N**
   - Project name? `staff-invoice-sheet` (or your preferred name)
   - In which directory is your code located? `./` (press Enter)
   - Want to override settings? **N**

5. **Production deployment:**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard (GitHub Integration)

1. **Push to GitHub** (already done ✅)
   - Repository: https://github.com/Strongman1380/Epworth-Invoice-Tracking-Sheet

2. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/new

3. **Import Git Repository:**
   - Click "Add New Project"
   - Click "Import" next to your GitHub repository
   - Or paste: `Strongman1380/Epworth-Invoice-Tracking-Sheet`

4. **Configure Project:**
   - **Project Name:** `staff-invoice-sheet`
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** (leave empty)
   - **Output Directory:** `./`
   - **Install Command:** (leave empty)

5. **Environment Variables (Optional):**
   - No environment variables needed for now
   - Firebase config is already in the code

6. **Deploy:**
   - Click "Deploy"
   - Wait 30-60 seconds

---

## 📊 After Deployment

### Your Live URLs:

After deployment, you'll get URLs like:
- **Production:** `https://staff-invoice-sheet.vercel.app`
- **Preview (per commit):** `https://staff-invoice-sheet-git-[branch].vercel.app`

### Configure Custom Domain (Optional):

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `timesheet.epworth.org`)
3. Follow DNS configuration steps
4. SSL certificate is automatic

---

## 🔄 Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch = automatic production deployment
- Every pull request = automatic preview deployment
- Zero-downtime deployments

---

## 🔧 Environment Variables Setup

If you want to move sensitive data to environment variables:

1. **Go to Vercel Dashboard:**
   - Project → Settings → Environment Variables

2. **Add Variables:**
   ```
   GOOGLE_MAPS_API_KEY = AIzaSyDHuKbelQ7u7Ukb5BvfGnx_-5dvz1xM1w4
   FIREBASE_API_KEY = AIzaSyB1wUyv15yap-K9ZFKvhpmOhKO2zxOExLc
   ```

3. **Update Code to Use Environment Variables:**
   - This would require a build step with Vite/Webpack
   - Current setup works fine with embedded keys (restricted to your domains)

---

## 🧪 Testing Deployment

After deployment:

1. **Visit your Vercel URL**
2. **Test all features:**
   - ✅ Dashboard loads
   - ✅ Create new timesheet
   - ✅ Save timesheet (localStorage)
   - ✅ Google Maps distance calculation works
   - ✅ Address autocomplete works
   - ✅ Export to Excel works
   - ✅ Auto-save functionality

3. **Check Console for Errors:**
   - Press F12 → Console tab
   - Should see: "✅ Firebase initialized successfully"

---

## 🔒 Security Updates After Deployment

### Update Google Maps API Key Restrictions:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Add Vercel domains to HTTP referrers:
   ```
   https://staff-invoice-sheet.vercel.app/*
   https://staff-invoice-sheet-*.vercel.app/*
   https://your-custom-domain.com/*
   ```

---

## 📱 Features Available on Vercel

✅ **Automatic HTTPS** - SSL certificates included
✅ **Global CDN** - Fast loading worldwide
✅ **Zero-config deployment** - Just push to GitHub
✅ **Preview deployments** - Test before production
✅ **Analytics** (optional) - Track usage
✅ **Edge Network** - Low latency
✅ **Custom Domains** - Free SSL for your domain

---

## 🆚 Vercel vs Firebase Hosting

| Feature | Vercel | Firebase Hosting |
|---------|--------|------------------|
| Deployment | GitHub auto-deploy | Manual or CLI |
| Custom Domain | Free SSL | Free SSL |
| CDN | Global | Global |
| Analytics | Built-in | Google Analytics |
| Build Step | Optional | Optional |
| Pricing | Free tier generous | Free tier generous |

**Recommendation:** Use Vercel for easier GitHub integration and better developer experience.

---

## 🐛 Troubleshooting

### Issue: "Module not found"
- **Cause:** Vercel can't find files
- **Solution:** Check `vercel.json` routing configuration

### Issue: "Firebase not loading"
- **Cause:** CORS error with ES modules
- **Solution:** Files are already configured correctly with `type="module"`

### Issue: "Google Maps not loading"
- **Cause:** API key restrictions
- **Solution:** Add Vercel domain to allowed referrers

### Issue: "localStorage not working"
- **Cause:** Browser privacy settings
- **Solution:** Ask users to enable localStorage in browser settings

---

## 📞 Support

**Vercel Documentation:**
- Getting Started: https://vercel.com/docs
- Deployment: https://vercel.com/docs/deployments/overview
- Custom Domains: https://vercel.com/docs/custom-domains

**Your Repositories:**
- GitHub: https://github.com/Strongman1380/Epworth-Invoice-Tracking-Sheet
- Firebase: https://console.firebase.google.com/project/staff-invoice-sheet

---

## 🎯 Quick Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm [deployment-url]
```

---

**Last Updated:** February 2026
**Deployment Status:** Ready to deploy
**Next Step:** Run `vercel` or connect GitHub repository
