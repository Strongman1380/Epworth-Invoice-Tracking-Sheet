# Voice Recording Implementation Guide

This guide covers implementing voice note recording, storage, and transcription for the Daily Reflection Journal.

## Overview

Voice recording allows participants to speak their reflections instead of typing, which can be:
- **More natural** for some users
- **Faster** than typing on mobile
- **Accessible** for users with motor difficulties
- **Emotionally powerful** - capturing tone and nuance

## Architecture

```
┌─────────────┐
│  Mobile App │
│             │
│  1. Record  │──┐
│  2. Upload  │  │
│  3. Display │  │
└─────────────┘  │
                 │
                 ▼
         ┌───────────────┐
         │   Supabase    │
         │   Storage     │
         │  voice-notes/ │
         └───────────────┘
                 │
                 ▼
         ┌───────────────┐      ┌──────────────┐
         │   Supabase    │      │  Transcription│
         │  reflections  │◀─────│   Service     │
         │    table      │      │ (Whisper API) │
         └───────────────┘      └──────────────┘
```

## Phase 1: Basic Recording

### Mobile Component

Create `mobile/src/components/VoiceRecorder.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function VoiceRecorder({ onRecordingComplete }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need microphone access to record voice notes.'
        );
      }
    })();
  }, []);

  async function startRecording() {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);

      // Track duration
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setDuration(Math.floor(status.durationMillis / 1000));
        }
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording failed', 'Unable to start recording right now.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Get recording metadata
      const status = await recording.getStatusAsync();

      onRecordingComplete({
        uri,
        duration: status.durationMillis,
        size: status.metering, // Optional: for waveform
      });

      setRecording(null);
      setDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Save paused', 'Could not save your voice note.');
    }
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      {isRecording ? (
        <View style={styles.recordingPanel}>
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          <Pressable
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <Text style={styles.stopButtonText}>Stop & Save</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.startButton}
          onPress={startRecording}
        >
          <Text style={styles.startButtonText}>🎙️ Record voice note</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordingPanel: {
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 8,
    ...typography.emphasis,
  },
  duration: {
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: 16,
    ...typography.header,
  },
  startButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    ...typography.emphasis,
  },
  stopButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    ...typography.emphasis,
  },
});
```

### Usage in Journal Screen

Update `mobile/App.js`:

```javascript
import { VoiceRecorder } from './src/components/VoiceRecorder';

// Inside your component:
const [voiceNoteUri, setVoiceNoteUri] = useState(null);

function handleRecordingComplete(recording) {
  setVoiceNoteUri(recording.uri);
  Alert.alert('Saved', 'Voice note captured. Submit to upload.');
}

// In your render:
<VoiceRecorder onRecordingComplete={handleRecordingComplete} />
```

## Phase 2: Upload to Supabase Storage

### Upload Function

Add to `mobile/src/lib/api_supabase.js`:

```javascript
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Upload a voice note to Supabase Storage
 */
export async function uploadVoiceNote(uri, reflectionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert to blob
  const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([arrayBuffer], { type: 'audio/m4a' });

  // Upload to Supabase
  const fileName = `${user.id}/${reflectionId}.m4a`;
  const { data, error } = await supabase.storage
    .from('voice-notes')
    .upload(fileName, blob, {
      contentType: 'audio/m4a',
      upsert: true,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('voice-notes')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

### Update Reflection Creation

```javascript
async function handleSubmit() {
  // ... existing validation ...

  let voiceNoteUrl = null;
  if (voiceNoteUri) {
    const tempId = Date.now().toString();
    voiceNoteUrl = await uploadVoiceNote(voiceNoteUri, tempId);
  }

  await createReflection({
    promptId,
    body,
    emotions,
    insights,
    voiceNoteUrl,
  });
}
```

## Phase 3: Audio Playback

### Playback Component

Create `mobile/src/components/AudioPlayer.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';

export function AudioPlayer({ uri, duration }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  async function playPause() {
    if (!sound) {
      // Load and play
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            setSound(null);
            setPosition(0);
            setIsPlaying(false);
          }
        }
      });

      setSound(newSound);
      setIsPlaying(true);
    } else {
      // Toggle play/pause
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    }
  }

  function formatTime(ms) {
    const seconds = Math.floor((ms || 0) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.playButton} onPress={playPause}>
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.time}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playIcon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  time: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
```

## Phase 4: Transcription

### Option A: OpenAI Whisper API

Create `backend/app/transcription.py`:

```python
import os
import httpx
from fastapi import UploadFile

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio file using OpenAI Whisper API.
    """
    async with httpx.AsyncClient() as client:
        with open(file_path, 'rb') as audio_file:
            files = {'file': audio_file}
            data = {
                'model': 'whisper-1',
                'language': 'en',  # Optional
            }
            headers = {
                'Authorization': f'Bearer {OPENAI_API_KEY}'
            }

            response = await client.post(
                'https://api.openai.com/v1/audio/transcriptions',
                files=files,
                data=data,
                headers=headers,
            )

            if response.status_code != 200:
                raise Exception(f"Transcription failed: {response.text}")

            return response.json()['text']
```

### Add Transcription Endpoint

In `backend/app/main_supabase.py`:

```python
from .transcription import transcribe_audio

@app.post("/api/reflections/{reflection_id}/transcribe")
async def transcribe_reflection(
    reflection_id: UUID,
    authorization: Optional[str] = Header(None)
):
    """
    Transcribe the voice note for a reflection.
    """
    user_id = get_user_from_token(authorization)
    supabase = get_supabase_client()

    # Get reflection
    reflection = supabase.table("reflections")\
        .select("voice_note_url, user_id")\
        .eq("id", str(reflection_id))\
        .single()\
        .execute()

    if not reflection.data or reflection.data["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Not found")

    voice_url = reflection.data.get("voice_note_url")
    if not voice_url:
        raise HTTPException(status_code=400, detail="No voice note")

    # Download audio
    temp_path = f"/tmp/{reflection_id}.m4a"
    # ... download from Supabase Storage to temp_path ...

    # Transcribe
    transcript = await transcribe_audio(temp_path)

    # Update reflection
    supabase.table("reflections")\
        .update({"voice_note_transcript": transcript})\
        .eq("id", str(reflection_id))\
        .execute()

    return {"transcript": transcript}
```

### Option B: Local Whisper (Free)

For self-hosted transcription:

```bash
pip install openai-whisper
```

```python
import whisper

model = whisper.load_model("base")

def transcribe_audio(file_path: str) -> str:
    result = model.transcribe(file_path)
    return result["text"]
```

## Phase 5: Mobile Integration

### Auto-transcribe on Upload

```javascript
async function handleSubmit() {
  // Upload voice note
  let voiceNoteUrl = null;
  if (voiceNoteUri) {
    const tempId = Date.now().toString();
    voiceNoteUrl = await uploadVoiceNote(voiceNoteUri, tempId);
  }

  // Create reflection
  const reflection = await createReflection({
    promptId,
    body: body || '[Voice note]',
    emotions,
    insights,
    voiceNoteUrl,
  });

  // Request transcription in background
  if (voiceNoteUrl) {
    transcribeReflection(reflection.id).catch(console.error);
  }
}
```

## Testing Checklist

- [ ] Microphone permissions work on iOS and Android
- [ ] Recording starts/stops cleanly
- [ ] Duration counter updates in real-time
- [ ] Audio file uploads to Supabase Storage
- [ ] Playback works for uploaded recordings
- [ ] Transcription completes successfully
- [ ] Transcript saves to database
- [ ] Offline queue handles voice notes
- [ ] File cleanup after upload
- [ ] Error handling for all failure modes

## Security Considerations

1. **Storage Policies** - Ensure RLS prevents access to others' voice notes
2. **File Size Limits** - Set max 10MB in Supabase
3. **Content Type** - Validate audio MIME types
4. **API Rate Limits** - Implement rate limiting for transcription
5. **GDPR Compliance** - Allow users to delete voice notes

## Cost Estimates

### OpenAI Whisper API
- $0.006 per minute of audio
- 100 reflections/day × 2 min avg = 200 min/day
- Cost: ~$1.20/day = $36/month

### Alternatives
- **AssemblyAI**: $0.00025/sec ($0.015/min)
- **Google Speech-to-Text**: $0.006/15sec
- **Self-hosted Whisper**: Free (requires GPU server)

## Performance Optimization

1. **Compress audio** before upload (reduce from ~1MB/min to ~100KB/min)
2. **Lazy load** transcripts (fetch on demand)
3. **Cache** transcripts locally after first load
4. **Background processing** for transcription (don't block UI)

## Accessibility

- Provide visual feedback during recording
- Show waveform or pulsing indicator
- Allow pause/resume for longer recordings
- Transcript editing for correction
- Captions in playback

## Next Steps

1. Implement basic recording with VoiceRecorder component
2. Test upload to Supabase Storage
3. Add playback with AudioPlayer
4. Choose transcription provider
5. Implement background transcription
6. Add transcript editing UI
7. Test offline sync for voice notes
