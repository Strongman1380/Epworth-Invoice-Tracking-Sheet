# Testing Guide - Pathways Companion

Quick guide to test the current prototype build.

## What's Ready to Test

✅ **Daily Reflection Journal** (Complete)
- 3 guided prompts
- Text entry with emotion tagging (9 emotions)
- Insights field
- 7-day emotion trends

✅ **Crisis & Support Resources** (Complete)
- Emergency hotlines (call functionality)
- Crisis text line
- Local resource search (placeholder)
- Quick Exit button

✅ **Learning Hub** (Coming Soon screen)
- Placeholder showing planned features

✅ **Tab Navigation**
- Switch between Journal, Support, and Learn tabs

## Quick Start (5 minutes)

### 1. Start the Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Verify**: Visit http://localhost:8000/health
- Should see: `{"status": "ok"}`

### 2. Start the Mobile App

```bash
cd mobile
npm start
```

**Options**:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### 3. Choose Your Entry Point

You have two options:

#### Option A: Journal Only (Original)
- App launches directly to journal
- Uses `App.js` (default)

#### Option B: Full Navigation (New)
- Tab bar at bottom
- Switch between screens
- **To use**: Update `package.json`:

```json
{
  "main": "AppWithNav.js"
}
```

Or rename:
```bash
mv App.js App_JournalOnly.js
mv AppWithNav.js App.js
```

## Test Scenarios

### Scenario 1: Create a Reflection

1. **Select a prompt** (tap "Guided prompt", "Replacement practice", or "Reflection")
2. **Write reflection**: Type in "What came up for you?" field
3. **Tag emotions**: Tap 1-3 emotions (Calm, Anger, Hope, etc.)
4. **Add insight** (optional): Write in "Insight or takeaway" field
5. **Save**: Tap "Save reflection" button
6. **Verify**:
   - Alert shows "Saved"
   - Form clears
   - Trend preview updates

### Scenario 2: Test Emotion Trends

1. Create multiple reflections with different emotions
2. Scroll to bottom to see "Trend preview"
3. Check that emotion counts update
4. Bar chart shows relative frequencies

### Scenario 3: Crisis Resources

1. **Navigate** to Support tab (if using AppWithNav)
2. **Test calling**:
   - Tap "Call 1-800-799-7233" (DV Hotline)
   - Phone app should open with number
3. **Test texting**:
   - Tap "Text HOME to 741741"
   - SMS app should open with pre-filled message
4. **Quick Exit**:
   - Tap "Quick Exit" button
   - Confirm dialog appears
   - (Currently just logs, doesn't exit)

### Scenario 4: Navigation

1. **Switch tabs**: Tap Journal → Support → Learn
2. **Verify**: Each screen loads correctly
3. **Journal state**: Switch away and back, check if form persists
4. **Visual feedback**: Active tab highlighted in purple

## Backend Testing

### Test Health Endpoint

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

### Test Create Reflection

```bash
curl -X POST http://localhost:8000/api/reflections \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "awareness",
    "body": "Test reflection entry",
    "emotions": ["Calm", "Hope"],
    "insights": "Testing the API",
    "userId": "test-user",
    "createdAt": "2025-10-07T12:00:00Z"
  }'
```

Expected: Returns reflection with ID

### Test Get Trends

```bash
curl http://localhost:8000/api/reflections/test-user/trend
```

Expected: Returns emotion counts or default data

### View Stored Data

```bash
cat backend/data/reflections.json
```

Should show all saved reflections as JSON array.

## Troubleshooting

### Backend Issues

**Port already in use**:
```bash
lsof -ti:8000 | xargs kill -9
```

**Import errors**:
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

**Data file missing**:
```bash
mkdir -p backend/data
touch backend/data/reflections.json
echo "[]" > backend/data/reflections.json
```

### Mobile Issues

**Metro bundler cache**:
```bash
cd mobile
rm -rf node_modules
npm install
npm start -- --clear
```

**Component not found**:
```bash
# Check all imports exist
ls -R mobile/src/
```

**Can't connect to backend**:
- iOS simulator: Use `http://localhost:8000`
- Android emulator: Use `http://10.0.2.2:8000`
- Physical device: Use your computer's IP `http://192.168.1.x:8000`

Update in `mobile/src/lib/api.js`:
```javascript
const API_BASE_URL = 'http://YOUR_IP:8000';
```

### Navigation Issues

**Tabs not showing**:
- Make sure you're using `AppWithNav.js` as entry point
- Check `package.json` `"main"` field

**Screen not updating**:
- State might be stale
- Try switching tabs away and back

## What to Look For

### ✅ Good Signs

- Form clears after save
- Emotion tags toggle on/off (max 3)
- Trends update when reflections added
- Calls/texts open phone/SMS app
- No error messages in console
- Backend logs show requests

### ⚠️ Issues to Note

- Pydantic warnings (safe to ignore for now)
- Node version warnings (safe to ignore)
- Supabase imports (not used in prototype mode)
- Quick Exit doesn't actually exit (placeholder)
- Local resource search (placeholder)

## Performance Checks

- **Form responsiveness**: Should feel instant
- **API response time**: < 200ms for saves
- **Smooth scrolling**: No lag on journal screen
- **Emotion trend render**: Quick, even with many items

## Data Validation

### Check JSON Storage

```bash
cd backend/data
cat reflections.json | python -m json.tool
```

Should see properly formatted array with:
- Unique IDs
- All required fields
- ISO timestamps
- Emotion arrays (max 3 items)

### Check Emotion Limits

1. Try selecting 4 emotions
2. Verify only 3 are selected
3. Must deselect one before selecting another

## Next Steps After Testing

Once you've verified everything works:

1. **Production Mode**: Follow [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for Supabase
2. **Voice Recording**: Follow [VOICE_RECORDING_GUIDE.md](VOICE_RECORDING_GUIDE.md)
3. **More Features**: See [CURRENT_STATUS.md](CURRENT_STATUS.md) roadmap

## Reporting Issues

Found a bug? Note:
- Which screen/feature
- Steps to reproduce
- Expected vs actual behavior
- Console logs
- Device/platform (iOS/Android/web)

---

**Happy Testing!** 🧪

The core journal functionality is solid. Crisis resources are ready. Foundation is set for authentication and advanced features.
