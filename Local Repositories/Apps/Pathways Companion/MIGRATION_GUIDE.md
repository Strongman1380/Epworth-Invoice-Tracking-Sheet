# Migration Guide: JSON Storage → Supabase

This guide walks you through migrating the Pathways Companion from local JSON storage to Supabase with authentication, PostgreSQL persistence, and offline support.

## Prerequisites

- Supabase account (free tier works fine)
- Node.js 20+ installed
- Python 3.11+ installed
- Expo CLI for mobile development

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Project name**: `pathways-companion`
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait ~2 minutes

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `backend/database/schema.sql`
3. Paste into the SQL editor
4. Click **Run** to execute

This will create:
- `profiles`, `prompts`, and `reflections` tables
- Row Level Security (RLS) policies
- Storage bucket for voice notes
- Helper functions for trends

## Step 3: Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)
   - **service_role key**: `eyJhbG...` (different long string)

⚠️ **Important**: Keep `service_role` key secret! Never commit to git or expose to frontend.

## Step 4: Configure Backend

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your credentials:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

4. Install new dependencies:
   ```bash
   source .venv/bin/activate  # If not already activated
   pip install -r requirements.txt
   ```

5. Test the new backend:
   ```bash
   # Use the Supabase version
   uvicorn app.main_supabase:app --reload --port 8000
   ```

6. Visit http://localhost:8000/health - you should see:
   ```json
   {"status": "ok", "version": "0.2.0", "storage": "supabase"}
   ```

## Step 5: Configure Mobile App

1. Navigate to mobile directory:
   ```bash
   cd ../mobile
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your credentials:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Install new dependencies:
   ```bash
   npm install
   ```

## Step 6: Update App.js to Use Authentication

Replace `mobile/App.js` with this wrapper that includes auth:

```javascript
import React from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import JournalScreen from './JournalScreen';  // Your existing App.js content

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <JournalScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

Move your existing `App.js` content into `JournalScreen.js` and update the imports to use `api_supabase.js` instead of `api.js`.

## Step 7: Migrate Existing Data (Optional)

If you have existing reflections in `backend/data/reflections.json`, create a migration script:

```python
# backend/scripts/migrate_data.py
import json
from pathlib import Path
from supabase_client import get_supabase_client

def migrate():
    supabase = get_supabase_client()
    data_file = Path(__file__).parent.parent / "data" / "reflections.json"

    if not data_file.exists():
        print("No data to migrate")
        return

    with open(data_file) as f:
        reflections = json.load(f)

    for item in reflections:
        supabase.table("reflections").insert({
            "user_id": "YOUR_USER_ID",  # Get from Supabase auth
            "prompt_id": item.get("promptId"),
            "body": item.get("body"),
            "emotions": item.get("emotions", []),
            "insights": item.get("insights"),
            "created_at": item.get("createdAt"),
        }).execute()

    print(f"Migrated {len(reflections)} reflections")

if __name__ == "__main__":
    migrate()
```

Run it:
```bash
cd backend
source .venv/bin/activate
python scripts/migrate_data.py
```

## Step 8: Test End-to-End

### Test Backend API

```bash
# In terminal 1 - start backend
cd backend
source .venv/bin/activate
uvicorn app.main_supabase:app --reload --port 8000
```

### Test Mobile App

```bash
# In terminal 2 - start mobile
cd mobile
npm run start
```

### Test Flow

1. Open app in Expo
2. Sign up with test email/password
3. Check your email for confirmation link
4. Sign in
5. Create a reflection
6. Verify it appears in Supabase dashboard under **Table Editor** → **reflections**

## Step 9: Enable Offline Support

Update your journal screen to use offline queue:

```javascript
import { isOnline, queueReflection, syncQueue } from './src/lib/offlineQueue';
import { createReflection } from './src/lib/api_supabase';

async function handleSubmit() {
  const online = await isOnline();

  if (online) {
    // Save directly
    await createReflection(reflectionData);
  } else {
    // Queue for later
    await queueReflection(reflectionData);
    Alert.alert(
      'Saved offline',
      'Your reflection will sync when you\'re back online.'
    );
  }
}
```

Add auto-sync listener in your app:

```javascript
import { setupAutoSync } from './src/lib/offlineQueue';

useEffect(() => {
  const unsubscribe = setupAutoSync((results) => {
    if (results.synced > 0) {
      console.log(`Synced ${results.synced} reflections`);
    }
  });

  return () => unsubscribe();
}, []);
```

## Step 10: Production Deployment

### Backend Deployment Options

**Option A: Vercel** (Recommended for FastAPI)
```bash
cd backend
vercel deploy
```

**Option B: Render**
1. Connect GitHub repo
2. Set environment variables from `.env`
3. Deploy

### Mobile Deployment

**iOS**:
```bash
cd mobile
eas build --platform ios
eas submit --platform ios
```

**Android**:
```bash
eas build --platform android
eas submit --platform android
```

## Troubleshooting

### "Missing Supabase credentials" error

Make sure:
- `.env` files exist (not just `.env.example`)
- Credentials are correct (no extra spaces)
- For mobile: Use `EXPO_PUBLIC_` prefix

### RLS Policy Errors

Check that:
- User is authenticated
- RLS policies are enabled
- User owns the data they're trying to access

### Offline queue not syncing

Verify:
- NetInfo permissions granted
- Internet connection is stable
- Check queue with: `AsyncStorage.getItem('@pathways/offline_queue')`

## Rollback Plan

If you need to rollback to JSON storage:

1. Backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

2. Mobile: Revert `App.js` and use `api.js` instead of `api_supabase.js`

## Next Steps

- [ ] Set up [Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [ ] Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) for emails
- [ ] Add [rate limiting](https://supabase.com/docs/guides/platform/going-into-prod#rate-limiting--resource-allocation)
- [ ] Enable [backups](https://supabase.com/docs/guides/platform/backups)
- [ ] Implement voice recording feature with Storage
- [ ] Add real-time subscriptions for multi-device sync

## Support

For issues:
- Check [Supabase docs](https://supabase.com/docs)
- Review RLS policies in SQL Editor
- Check browser/app console for errors
- Verify environment variables are set correctly
