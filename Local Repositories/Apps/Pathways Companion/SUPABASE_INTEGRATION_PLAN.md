# Supabase Integration Plan

## Overview
Migrate from JSON file storage to Supabase for authentication, PostgreSQL persistence, and real-time capabilities for the Pathways Companion Daily Reflection Journal.

## Phase 1: Supabase Setup & Database Schema

### 1.1 Supabase Project Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Note project URL and anon/service keys
- [ ] Create `.env` files for both mobile and backend

### 1.2 Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  participant_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts table
CREATE TABLE public.prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reflections table
CREATE TABLE public.reflections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id TEXT REFERENCES public.prompts(id),
  body TEXT NOT NULL,
  emotions TEXT[] DEFAULT '{}',
  insights TEXT,
  voice_note_url TEXT,
  voice_note_transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotion trends materialized view
CREATE MATERIALIZED VIEW emotion_trends AS
SELECT
  user_id,
  unnest(emotions) as emotion,
  DATE(created_at) as date,
  COUNT(*) as count
FROM reflections
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, emotion, DATE(created_at);

-- Indexes for performance
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_created_at ON reflections(created_at DESC);
CREATE INDEX idx_reflections_user_created ON reflections(user_id, created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Reflections policies
CREATE POLICY "Users can view own reflections"
  ON public.reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON public.reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
  ON public.reflections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections"
  ON public.reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Prompts are readable by all authenticated users
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view prompts"
  ON public.prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial prompts
INSERT INTO public.prompts (id, title, prompt_text, category) VALUES
  ('daily', 'Daily Check-in', 'How did you show up for yourself today?', 'general'),
  ('challenge', 'Challenge Reflection', 'What challenged you today, and what did you learn from it?', 'growth'),
  ('gratitude', 'Gratitude', 'What are you grateful for right now?', 'positive');
```

### 1.3 Storage Bucket for Voice Notes
```sql
-- Create storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false);

-- Storage policies
CREATE POLICY "Users can upload own voice notes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own voice notes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Phase 2: Backend Integration

### 2.1 Dependencies
Add to `backend/requirements.txt`:
```
supabase==2.3.4
python-dotenv==1.0.0
```

### 2.2 Environment Variables
Create `backend/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### 2.3 Supabase Client Setup
Create `backend/app/supabase_client.py`:
```python
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)
```

### 2.4 Update API Endpoints
Modify `backend/app/main.py` to use Supabase instead of JSON storage:
- Replace in-memory list with Supabase queries
- Add authentication middleware to validate JWT tokens
- Update reflection CRUD operations to use Supabase SDK

### 2.5 Migration Script
Create `backend/scripts/migrate_json_to_supabase.py` to migrate existing JSON data.

## Phase 3: Mobile App Integration

### 3.1 Dependencies
Add to `mobile/package.json`:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.43.5",
    "@react-native-async-storage/async-storage": "^1.23.1",
    "expo-secure-store": "~13.0.1"
  }
}
```

### 3.2 Supabase Client
Create `mobile/src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 3.3 Authentication Flow
Create authentication screens:
- `mobile/src/screens/AuthScreen.js` - Sign in/up
- `mobile/src/screens/OnboardingScreen.js` - Initial profile setup
- `mobile/src/contexts/AuthContext.js` - Auth state management

### 3.4 Update API Calls
Replace `mobile/src/lib/api.js` to use Supabase client directly:
```javascript
import { supabase } from './supabase';

export async function createReflection({ promptId, body, emotions, insights }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reflections')
    .insert({
      user_id: user.id,
      prompt_id: promptId,
      body,
      emotions,
      insights,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReflectionTrends() {
  const { data: { user } } = await supabase.auth.getUser();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('reflections')
    .select('emotions')
    .eq('user_id', user.id)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (error) throw error;

  // Aggregate emotions
  const counts = {};
  data.forEach(reflection => {
    reflection.emotions.forEach(emotion => {
      counts[emotion] = (counts[emotion] || 0) + 1;
    });
  });

  return {
    trend: Object.entries(counts).map(([emotion, count]) => ({
      emotion,
      count
    }))
  };
}
```

## Phase 4: Offline Support

### 4.1 Offline Queue
Create `mobile/src/lib/offlineQueue.js`:
- Queue mutations when offline
- Sync when back online
- Handle conflict resolution

### 4.2 Local Cache
- Use React Query or SWR for cache management
- Store reflections in AsyncStorage for offline viewing
- Implement optimistic updates

### 4.3 Sync Strategy
```javascript
// Listen to connectivity changes
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncOfflineQueue();
    }
  });
  return () => unsubscribe();
}, []);
```

## Phase 5: Voice Recording Integration

### 5.1 Dependencies
```json
{
  "dependencies": {
    "expo-av": "~15.0.1"
  }
}
```

### 5.2 Voice Recording Component
Create `mobile/src/components/VoiceRecorder.js`:
- Record audio using expo-av
- Upload to Supabase Storage
- Optionally transcribe using Whisper API or similar

### 5.3 Backend Transcription
Optional: Add transcription service integration
- Whisper API
- Google Speech-to-Text
- Azure Speech Services

## Phase 6: Testing & Security

### 6.1 Security Checklist
- [ ] Verify RLS policies work correctly
- [ ] Test that users cannot access others' data
- [ ] Secure API keys in environment variables
- [ ] Implement rate limiting on backend
- [ ] Add CSRF protection if needed

### 6.2 Testing
- [ ] Test authentication flow end-to-end
- [ ] Test offline → online sync
- [ ] Test voice recording and playback
- [ ] Load test with multiple concurrent users
- [ ] Test data migration script

## Next Immediate Steps

1. **Create Supabase project** and run schema SQL
2. **Update backend** to use Supabase client
3. **Add authentication UI** to mobile app
4. **Test end-to-end flow** with real Supabase instance
5. **Implement offline queue** for reliability
6. **Add voice recording** feature

## Future Enhancements

- Real-time updates using Supabase subscriptions
- Analytics dashboard for trends over time
- Push notifications for reflection reminders
- Share reflections with care team (opt-in)
- Export reflections as PDF/CSV
- AI-powered insights from journal patterns
