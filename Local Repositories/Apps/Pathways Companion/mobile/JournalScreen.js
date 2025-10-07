/**
 * Daily Reflection Journal Screen
 * Main journaling interface for participants with trauma-informed design
 */
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { colors } from './src/theme/colors';
import { typography } from './src/theme/typography';
import { PromptCard } from './src/components/PromptCard';
import { EmotionTag } from './src/components/EmotionTag';
import { TrendSnapshot } from './src/components/TrendSnapshot';
import { createReflection, getReflectionTrends } from './src/lib/api_supabase';
import { useJournalForm } from './src/hooks/useJournalForm';
import { useAuth } from './src/contexts/AuthContext';
import { isOnline, queueReflection, syncQueue } from './src/lib/offlineQueue';

export default function JournalScreen() {
  const { user, signOut } = useAuth();
  const {
    prompt,
    prompts,
    activePromptIndex,
    selectPrompt,
    entry,
    setEntry,
    selectedEmotions,
    toggleEmotion,
    emotionOptions,
    insights,
    setInsights,
    isSubmitting,
    setIsSubmitting,
    resetForm,
  } = useJournalForm();

  const [trendData, setTrendData] = useState(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [facilitatorVisible, setFacilitatorVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load trends on mount
  useEffect(() => {
    loadTrends();
  }, []);

  // Setup auto-sync for offline queue
  useEffect(() => {
    const interval = setInterval(async () => {
      const online = await isOnline();
      if (online && !isSyncing) {
        setIsSyncing(true);
        try {
          const results = await syncQueue();
          if (results.synced > 0) {
            console.log(`Synced ${results.synced} queued reflections`);
            loadTrends(); // Refresh trends after sync
          }
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isSyncing]);

  async function loadTrends() {
    try {
      setIsLoadingTrends(true);
      const data = await getReflectionTrends();
      setTrendData(data.trend);
    } catch (error) {
      console.warn('Unable to load trend data', error);
    } finally {
      setIsLoadingTrends(false);
    }
  }

  async function handleSubmit() {
    if (!entry.trim()) {
      Alert.alert('Reflection needed', 'Take a moment to add a reflection before saving.');
      return;
    }

    try {
      setIsSubmitting(true);

      const reflectionData = {
        promptId: prompt.id,
        body: entry.trim(),
        emotions: selectedEmotions,
        insights: insights.trim(),
        facilitatorVisible,
        createdAt: new Date().toISOString(),
      };

      // Check if online
      const online = await isOnline();

      if (online) {
        // Save directly to Supabase
        await createReflection(reflectionData);
        Alert.alert(
          'Saved',
          facilitatorVisible
            ? 'Your reflection is saved and will be visible to your facilitator.'
            : 'You practiced awareness today. Keep showing up for yourself.'
        );
      } else {
        // Queue for later sync
        await queueReflection(reflectionData);
        Alert.alert(
          'Saved offline',
          'Your reflection will sync automatically when you\'re back online.'
        );
      }

      resetForm();
      setFacilitatorVisible(false);
      loadTrends();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Save paused',
        'We could not save your reflection right now. Your note is still here.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign out?',
      'Your reflections are synced and will be here when you return.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Could not sign out. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Daily Reflection Journal</Text>
              <Text style={styles.subheading}>
                Honor the effort you put in today. These notes stay private unless you choose to
                share.
              </Text>
            </View>
            <Pressable onPress={handleSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>

          {/* Sync indicator */}
          {isSyncing && (
            <View style={styles.syncBanner}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.syncText}>Syncing reflections...</Text>
            </View>
          )}

          {/* Prompt selector */}
          <View style={styles.promptSelector}>
            {prompts.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (index !== activePromptIndex) {
                    selectPrompt(index);
                  }
                }}
                style={[
                  styles.promptPill,
                  index === activePromptIndex && styles.promptPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.promptPillText,
                    index === activePromptIndex && styles.promptPillTextActive,
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Prompt card */}
          <PromptCard title={prompt.title} prompt={prompt.prompt} />

          {/* Voice note panel (coming soon) */}
          <View style={styles.voicePanel}>
            <Text style={styles.voiceTitle}>Prefer to speak it out?</Text>
            <Text style={styles.voiceCaption}>
              Tap record and talk through your reflection. We'll transcribe it for you.
            </Text>
            <Pressable style={styles.voiceButton} accessibilityLabel="Start voice journal (coming soon)">
              <Text style={styles.voiceButtonText}>Record voice note · Coming soon</Text>
            </Pressable>
          </View>

          {/* Reflection input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What came up for you?</Text>
            <TextInput
              style={styles.textArea}
              value={entry}
              onChangeText={setEntry}
              multiline
              placeholder="When the tension showed up, I noticed..."
              placeholderTextColor={colors.textSecondary}
              textAlignVertical="top"
            />
          </View>

          {/* Emotion tags */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emotion tags</Text>
            <Text style={styles.helperText}>
              Tag up to three emotions that matched your experience. {selectedEmotions.length}/3
              selected.
            </Text>
            <View style={styles.emotionGrid}>
              {emotionOptions.map((label) => (
                <EmotionTag
                  key={label}
                  label={label}
                  active={selectedEmotions.includes(label)}
                  onPress={() => toggleEmotion(label)}
                />
              ))}
            </View>
          </View>

          {/* Insights */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insight or takeaway</Text>
            <TextInput
              style={styles.textArea}
              value={insights}
              onChangeText={setInsights}
              multiline
              placeholder="One thing I want to remember next time..."
              placeholderTextColor={colors.textSecondary}
              textAlignVertical="top"
            />
          </View>

          {/* Facilitator visibility toggle */}
          <View style={styles.facilitatorToggleContainer}>
            <View style={styles.facilitatorToggleText}>
              <Text style={styles.facilitatorToggleTitle}>Share with facilitator</Text>
              <Text style={styles.facilitatorToggleCaption}>
                Allow your facilitator to view this reflection to support your progress.
              </Text>
            </View>
            <Switch
              value={facilitatorVisible}
              onValueChange={setFacilitatorVisible}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={facilitatorVisible ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          {/* Submit button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || isSubmitting) && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save reflection</Text>
            )}
          </Pressable>

          {/* Take a break */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Take a pause whenever you need it.</Text>
            <Pressable style={styles.pauseButton}>
              <Text style={styles.pauseButtonText}>Take a break</Text>
            </Pressable>
          </View>

          {/* Emotion trends */}
          <View style={styles.trendSection}>
            {isLoadingTrends ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <TrendSnapshot data={trendData || undefined} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 28,
    color: colors.textPrimary,
    ...typography.header,
  },
  subheading: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    ...typography.body,
    maxWidth: '80%',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 14,
    color: colors.primary,
    ...typography.emphasis,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECEBFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
    ...typography.body,
  },
  promptSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  promptPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  promptPillActive: {
    backgroundColor: '#ECEBFF',
    borderColor: colors.primary,
  },
  promptPillText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...typography.emphasis,
  },
  promptPillTextActive: {
    color: colors.primary,
  },
  voicePanel: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
    ...typography.emphasis,
  },
  voiceCaption: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    ...typography.body,
  },
  voiceButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  voiceButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    ...typography.emphasis,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    ...typography.emphasis,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    ...typography.body,
  },
  textArea: {
    minHeight: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.textPrimary,
    ...typography.body,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  facilitatorToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  facilitatorToggleText: {
    flex: 1,
    marginRight: 12,
  },
  facilitatorToggleTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
    ...typography.emphasis,
  },
  facilitatorToggleCaption: {
    fontSize: 14,
    color: colors.textSecondary,
    ...typography.body,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    ...typography.emphasis,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    ...typography.body,
  },
  pauseButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  pauseButtonText: {
    fontSize: 14,
    color: colors.secondary,
    ...typography.emphasis,
  },
  trendSection: {
    marginBottom: 48,
  },
});
