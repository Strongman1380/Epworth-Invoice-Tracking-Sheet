/**
 * Authentication screen with sign in and sign up forms.
 * Trauma-informed design with calming colors and supportive copy.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useAuth } from '../contexts/AuthContext';

export function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      // Navigation happens automatically via AuthContext
    } catch (error) {
      Alert.alert(
        'Sign in paused',
        error.message || 'Unable to sign in right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password should be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, {
        display_name: displayName.trim() || 'Participant',
      });
      Alert.alert(
        'Welcome!',
        'Your account has been created. Check your email to confirm your account.'
      );
    } catch (error) {
      Alert.alert(
        'Sign up paused',
        error.message || 'Unable to create account right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Pathways Companion</Text>
            <Text style={styles.subtitle}>
              A safe space to reflect, honor your journey, and track your progress.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>

            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How should we address you?"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || loading) && styles.submitButtonPressed,
              ]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.switchButton}
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              <Text style={styles.switchButtonText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your reflections are private and encrypted. Only you can see them.
            </Text>
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: colors.primary,
    marginBottom: 8,
    ...typography.header,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
  },
  form: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 24,
    ...typography.header,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    ...typography.emphasis,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.textPrimary,
    ...typography.body,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    ...typography.emphasis,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    fontSize: 14,
    color: colors.primary,
    ...typography.emphasis,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.body,
  },
});
