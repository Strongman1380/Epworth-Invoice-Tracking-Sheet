-- Pathways Companion Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  participant_id TEXT UNIQUE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'facilitator', 'admin')),
  facilitator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  program_start_date DATE,
  passcode_hash TEXT,
  biometric_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth';
COMMENT ON COLUMN public.profiles.participant_id IS 'Optional external participant identifier';
COMMENT ON COLUMN public.profiles.role IS 'User role: participant, facilitator, or admin';
COMMENT ON COLUMN public.profiles.facilitator_id IS 'Assigned facilitator for participants';

-- Prompts table
CREATE TABLE IF NOT EXISTS public.prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.prompts IS 'Daily reflection journal prompts';

-- Reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id TEXT REFERENCES public.prompts(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  emotions TEXT[] DEFAULT '{}',
  insights TEXT,
  voice_note_url TEXT,
  voice_note_transcript TEXT,
  voice_note_duration_ms INTEGER,
  facilitator_visible BOOLEAN DEFAULT false,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.reflections IS 'User journal reflections with emotion tags';
COMMENT ON COLUMN public.reflections.emotions IS 'Array of emotion tags (max 3)';
COMMENT ON COLUMN public.reflections.voice_note_url IS 'URL to voice recording in Supabase Storage';
COMMENT ON COLUMN public.reflections.facilitator_visible IS 'Whether participant has consented to facilitator review';
COMMENT ON COLUMN public.reflections.ai_feedback IS 'Optional AI-generated motivational interviewing response';

-- Behaviors table (for incident tracking)
CREATE TABLE IF NOT EXISTS public.behaviors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  trigger TEXT,
  response TEXT,
  intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
  outcome TEXT,
  replacement_practice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.behaviors IS 'Incident and behavior tracking for accountability';
COMMENT ON COLUMN public.behaviors.intensity_level IS 'Self-reported intensity from 1 (low) to 10 (high)';

-- Wheel Progress table (Power & Control / Equality tracking)
CREATE TABLE IF NOT EXISTS public.wheel_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  segment_name TEXT NOT NULL,
  wheel_type TEXT CHECK (wheel_type IN ('power_control', 'equality')),
  completed BOOLEAN DEFAULT false,
  quiz_score INTEGER,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.wheel_progress IS 'User progress through Power & Control and Equality wheels';

-- Crisis Logs table
CREATE TABLE IF NOT EXISTS public.crisis_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crisis_type TEXT NOT NULL,
  resource_accessed TEXT,
  resolved BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.crisis_logs IS 'Logs of crisis resource access for safety monitoring';

-- Facilitator Notes table
CREATE TABLE IF NOT EXISTS public.facilitator_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facilitator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER,
  summary TEXT,
  attendance_status TEXT,
  export_status TEXT,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.facilitator_notes IS 'Weekly facilitator notes and progress summaries';

-- Learning streaks table
CREATE TABLE IF NOT EXISTS public.learning_streaks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_reflections INTEGER DEFAULT 0,
  total_lessons_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.learning_streaks IS 'Engagement tracking and gentle motivation';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reflections_user_id
  ON public.reflections(user_id);

CREATE INDEX IF NOT EXISTS idx_reflections_created_at
  ON public.reflections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reflections_user_created
  ON public.reflections(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reflections_emotions
  ON public.reflections USING GIN(emotions);

CREATE INDEX IF NOT EXISTS idx_prompts_active
  ON public.prompts(is_active, display_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_behaviors_user_date
  ON public.behaviors(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_progress_user
  ON public.wheel_progress(user_id, wheel_type);

CREATE INDEX IF NOT EXISTS idx_crisis_logs_user_time
  ON public.crisis_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_facilitator_notes_participant
  ON public.facilitator_notes(participant_id, week_number DESC);

CREATE INDEX IF NOT EXISTS idx_facilitator_notes_facilitator
  ON public.facilitator_notes(facilitator_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitator_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Reflections policies
DROP POLICY IF EXISTS "Users can view own reflections" ON public.reflections;
CREATE POLICY "Users can view own reflections"
  ON public.reflections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reflections" ON public.reflections;
CREATE POLICY "Users can insert own reflections"
  ON public.reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reflections" ON public.reflections;
CREATE POLICY "Users can update own reflections"
  ON public.reflections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reflections" ON public.reflections;
CREATE POLICY "Users can delete own reflections"
  ON public.reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Prompts policies (read-only for authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view active prompts" ON public.prompts;
CREATE POLICY "Authenticated users can view active prompts"
  ON public.prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Facilitators can view participant reflections if consent given
DROP POLICY IF EXISTS "Facilitators can view consented reflections" ON public.reflections;
CREATE POLICY "Facilitators can view consented reflections"
  ON public.reflections FOR SELECT
  USING (
    facilitator_visible = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'facilitator'
      AND profiles.id = (
        SELECT facilitator_id FROM public.profiles
        WHERE profiles.id = reflections.user_id
      )
    )
  );

-- Behaviors policies (participant only)
DROP POLICY IF EXISTS "Users can manage own behaviors" ON public.behaviors;
CREATE POLICY "Users can manage own behaviors"
  ON public.behaviors
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Facilitators can view participant behaviors
DROP POLICY IF EXISTS "Facilitators can view assigned participant behaviors" ON public.behaviors;
CREATE POLICY "Facilitators can view assigned participant behaviors"
  ON public.behaviors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'facilitator'
      AND profiles.id = (
        SELECT facilitator_id FROM public.profiles
        WHERE profiles.id = behaviors.user_id
      )
    )
  );

-- Wheel Progress policies
DROP POLICY IF EXISTS "Users can manage own wheel progress" ON public.wheel_progress;
CREATE POLICY "Users can manage own wheel progress"
  ON public.wheel_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Crisis Logs policies
DROP POLICY IF EXISTS "Users can manage own crisis logs" ON public.crisis_logs;
CREATE POLICY "Users can manage own crisis logs"
  ON public.crisis_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Facilitators can view participant crisis logs
DROP POLICY IF EXISTS "Facilitators can view participant crisis logs" ON public.crisis_logs;
CREATE POLICY "Facilitators can view participant crisis logs"
  ON public.crisis_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'facilitator'
      AND profiles.id = (
        SELECT facilitator_id FROM public.profiles
        WHERE profiles.id = crisis_logs.user_id
      )
    )
  );

-- Facilitator Notes policies
DROP POLICY IF EXISTS "Facilitators can manage own notes" ON public.facilitator_notes;
CREATE POLICY "Facilitators can manage own notes"
  ON public.facilitator_notes
  USING (auth.uid() = facilitator_id)
  WITH CHECK (auth.uid() = facilitator_id);

DROP POLICY IF EXISTS "Participants can view notes about them" ON public.facilitator_notes;
CREATE POLICY "Participants can view notes about them"
  ON public.facilitator_notes FOR SELECT
  USING (auth.uid() = participant_id);

-- Learning Streaks policies
DROP POLICY IF EXISTS "Users can manage own streaks" ON public.learning_streaks;
CREATE POLICY "Users can manage own streaks"
  ON public.learning_streaks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reflections_updated_at ON public.reflections;
CREATE TRIGGER update_reflections_updated_at
  BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompts_updated_at ON public.prompts;
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Participant'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS
-- ============================================

-- Emotion trends view (last 30 days)
CREATE OR REPLACE VIEW emotion_trends_30d AS
SELECT
  user_id,
  unnest(emotions) as emotion,
  DATE(created_at) as reflection_date,
  COUNT(*) as count
FROM public.reflections
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND emotions IS NOT NULL
  AND array_length(emotions, 1) > 0
GROUP BY user_id, emotion, DATE(created_at)
ORDER BY user_id, reflection_date DESC;

COMMENT ON VIEW emotion_trends_30d IS 'Daily emotion counts per user for the last 30 days';

-- Weekly reflection summary
CREATE OR REPLACE VIEW weekly_reflection_summary AS
SELECT
  user_id,
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) as reflection_count,
  COUNT(DISTINCT prompt_id) as unique_prompts_used,
  ARRAY_AGG(DISTINCT unnest(emotions)) FILTER (WHERE emotions IS NOT NULL) as all_emotions
FROM public.reflections
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY user_id, DATE_TRUNC('week', created_at)
ORDER BY user_id, week_start DESC;

COMMENT ON VIEW weekly_reflection_summary IS 'Weekly aggregated reflection stats';

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default prompts
INSERT INTO public.prompts (id, title, prompt_text, category, display_order) VALUES
  ('daily', 'Daily Check-in', 'How did you show up for yourself today?', 'general', 1),
  ('challenge', 'Challenge Reflection', 'What challenged you today, and what did you learn from it?', 'growth', 2),
  ('gratitude', 'Gratitude', 'What are you grateful for right now?', 'positive', 3),
  ('strength', 'Strength Recognition', 'What strength did you use today?', 'positive', 4),
  ('boundary', 'Boundary Check', 'How did you honor your boundaries today?', 'growth', 5),
  ('progress', 'Progress Note', 'What small step forward did you take today?', 'growth', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKET FOR VOICE NOTES
-- ============================================

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice notes
DROP POLICY IF EXISTS "Users can upload own voice notes" ON storage.objects;
CREATE POLICY "Users can upload own voice notes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own voice notes" ON storage.objects;
CREATE POLICY "Users can view own voice notes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own voice notes" ON storage.objects;
CREATE POLICY "Users can update own voice notes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own voice notes" ON storage.objects;
CREATE POLICY "Users can delete own voice notes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- HELPER FUNCTIONS FOR API
-- ============================================

-- Get emotion trend for user (last N days)
CREATE OR REPLACE FUNCTION get_emotion_trend(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(emotion TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(r.emotions) as emotion,
    COUNT(*) as count
  FROM public.reflections r
  WHERE r.user_id = p_user_id
    AND r.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND r.emotions IS NOT NULL
  GROUP BY unnest(r.emotions)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_emotion_trend IS 'Get aggregated emotion counts for a user over N days';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_emotion_trend TO authenticated;
