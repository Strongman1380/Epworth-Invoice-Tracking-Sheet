import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
import { createReflection, getReflectionTrends } from './src/lib/api';
import { useJournalForm } from './src/hooks/useJournalForm';

export default function App() {
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

  useEffect(() => {
    async function loadTrends() {
      try {
        setIsLoadingTrends(true);
        // TODO: Replace with authenticated user id once auth is wired up.
        const data = await getReflectionTrends('demo-user');
        setTrendData(data.trend);
      } catch (error) {
        // Surface a gentle notice and fall back to defaults.
        console.warn('Unable to load trend data', error);
      } finally {
        setIsLoadingTrends(false);
      }
    }

    loadTrends();
  }, []);

  async function handleSubmit() {
    if (!entry.trim()) {
      Alert.alert('Reflection needed', 'Take a moment to add a reflection before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createReflection({
        promptId: prompt.id,
        body: entry.trim(),
        emotions: selectedEmotions,
        insights: insights.trim(),
        userId: 'demo-user',
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Saved', 'You practiced awareness today. Keep showing up for yourself.');
      resetForm();
    } catch (error) {
      Alert.alert('Save paused', 'We could not reach the server. Your note is still on this page.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.heading}>Daily Reflection Journal</Text>
            <Text style={styles.subheading}>
              Honor the effort you put in today. These notes stay private unless you choose to
              share.
            </Text>
          </View>

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

          <PromptCard title={prompt.title} prompt={prompt.prompt} />

          <View style={styles.voicePanel}>
            <Text style={styles.voiceTitle}>Prefer to speak it out?</Text>
            <Text style={styles.voiceCaption}>
              Tap record and talk through your reflection. We’ll transcribe it for you.
            </Text>
            <Pressable style={styles.voiceButton} accessibilityLabel="Start voice journal (coming soon)">
              <Text style={styles.voiceButtonText}>Record voice note · Coming soon</Text>
            </Pressable>
          </View>

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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Take a pause whenever you need it.</Text>
            <Pressable style={styles.pauseButton}>
              <Text style={styles.pauseButtonText}>Take a break</Text>
            </Pressable>
          </View>

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
