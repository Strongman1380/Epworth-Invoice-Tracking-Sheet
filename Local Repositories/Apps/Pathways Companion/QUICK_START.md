# Quick Start Guide

Get the Pathways Companion running in 5 minutes.

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Git**
- **Expo Go** app on your phone (iOS/Android)

## Option A: Prototype Mode (JSON Storage)

Perfect for testing the UI/UX without setting up a database.

### 1. Clone & Install

```bash
# Clone the repo
git clone <your-repo-url>
cd pathways-companion

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Mobile
cd ../mobile
npm install
```

### 2. Start Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

### 3. Start Mobile App

```bash
cd mobile
npm run start
```

Scan the QR code with:
- **iOS**: Camera app → Opens in Expo Go
- **Android**: Expo Go app → Scan QR

### 4. Test the App

1. App opens to Daily Reflection Journal
2. Select a prompt
3. Type a reflection
4. Tag 1-3 emotions
5. Add insights (optional)
6. Tap "Save reflection"
7. See your emotion trends update

**Data is stored in**: `backend/data/reflections.json`

---

## Option B: Production Mode (Supabase)

Full authentication, PostgreSQL database, offline sync.

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up
2. Click "New Project"
3. Name: `pathways-companion`
4. Generate strong password (save it!)
5. Choose region → Create project (wait ~2 min)

### 2. Set Up Database

1. In Supabase dashboard → **SQL Editor**
2. Copy contents of `backend/database/schema.sql`
3. Paste and click **Run**
4. Verify tables created in **Table Editor**

### 3. Get Credentials

In Supabase → **Settings** → **API**:

- **URL**: `https://xxx.supabase.co`
- **anon key**: `eyJhbG...` (public)
- **service_role key**: `eyJhbG...` (secret)

### 4. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...service-role-key
SUPABASE_ANON_KEY=eyJhbG...anon-key

# Mobile
cd ../mobile
cp .env.example .env
# Edit .env:
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...anon-key
```

### 5. Install Dependencies

```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# Mobile
cd ../mobile
npm install
```

### 6. Start Production Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main_supabase:app --reload --port 8000
```

Test: Visit http://localhost:8000/health
```json
{"status":"ok","version":"0.2.0","storage":"supabase"}
```

### 7. Update App.js

Replace `mobile/App.js` with:

```javascript
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import JournalScreen from './JournalScreen';  // Your existing App.js

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <AuthScreen />;
  return <JournalScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppContent />
    </AuthProvider>
  );
}
```

Rename your current `App.js` to `JournalScreen.js` and update imports:

```javascript
// Change this:
import { createReflection, getReflectionTrends } from './src/lib/api';

// To this:
import { createReflection, getReflectionTrends } from './src/lib/api_supabase';
```

### 8. Start Mobile App

```bash
cd mobile
npm run start
```

### 9. Test Full Flow

1. Scan QR code → Opens auth screen
2. Tap "Create account"
3. Enter email/password → Sign up
4. Check email for confirmation link
5. Click link → Account confirmed
6. Return to app → Sign in
7. Create reflection
8. Check Supabase dashboard → Reflection appears in `reflections` table!

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Fix**: Activate virtual environment
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Mobile app shows errors

**Error**: `Unable to resolve module @supabase/supabase-js`

**Fix**: Install dependencies
```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to backend

**Error**: Network request failed

**Fix**: Update API URL in `mobile/src/lib/api.js`:
```javascript
// For iOS simulator
const API_URL = 'http://localhost:8000';

// For Android emulator
const API_URL = 'http://10.0.2.2:8000';

// For physical device (replace with your IP)
const API_URL = 'http://192.168.1.100:8000';
```

### Auth not working

**Check**:
1. `.env` files exist (not `.env.example`)
2. Supabase URL has `https://`
3. No extra spaces in keys
4. Mobile uses `EXPO_PUBLIC_` prefix

**Test connection**:
```javascript
// In mobile/App.js
import { supabase } from './src/lib/supabase';

useEffect(() => {
  supabase.from('prompts').select('*').then(console.log);
}, []);
```

### Supabase RLS errors

**Error**: `new row violates row-level security policy`

**Fix**: Check you're authenticated
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);  // Should not be null
```

---

## Common Commands

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000              # Prototype
uvicorn app.main_supabase:app --reload --port 8000    # Production
python -m compileall app                               # Check syntax

# Mobile
cd mobile
npm run start          # Start dev server
npm run ios            # Open iOS simulator
npm run android        # Open Android emulator
npm run web            # Open in browser

# Supabase
supabase login
supabase db reset      # Reset database
supabase db push       # Push schema changes
supabase functions deploy  # Deploy edge functions
```

---

## File Locations

### Configuration
- Backend env: `backend/.env`
- Mobile env: `mobile/.env`
- Database schema: `backend/database/schema.sql`

### Important Files
- Prototype backend: `backend/app/main.py`
- Production backend: `backend/app/main_supabase.py`
- Mobile entry: `mobile/App.js`
- Auth context: `mobile/src/contexts/AuthContext.js`
- Auth screen: `mobile/src/screens/AuthScreen.js`
- API (prototype): `mobile/src/lib/api.js`
- API (production): `mobile/src/lib/api_supabase.js`
- Offline queue: `mobile/src/lib/offlineQueue.js`

---

## Next Steps

After getting it running:

1. **Read the docs**
   - [README.md](README.md) - Full overview
   - [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Production deployment
   - [VOICE_RECORDING_GUIDE.md](VOICE_RECORDING_GUIDE.md) - Add voice notes

2. **Customize prompts**
   - Edit seed data in `backend/database/schema.sql`
   - Or add via Supabase Table Editor

3. **Deploy**
   - Backend → Vercel/Render
   - Mobile → EAS Build

4. **Add features**
   - Voice recording
   - Export reflections
   - Analytics dashboard

---

## Need Help?

- **Bug?** Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) → Known Issues
- **Deployment?** See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) → Step 10
- **Supabase?** Visit [supabase.com/docs](https://supabase.com/docs)
- **Expo?** Visit [docs.expo.dev](https://docs.expo.dev)

---

**You're all set!** 🎉 Now go build something meaningful for trauma survivors.
