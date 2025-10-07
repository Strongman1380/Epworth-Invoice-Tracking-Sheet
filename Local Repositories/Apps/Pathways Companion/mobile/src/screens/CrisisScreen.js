/**
 * Crisis & Support Resources Screen
 * Immediate access to crisis hotlines and support services
 * Includes Quick Exit functionality for safety
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const CRISIS_RESOURCES = [
  {
    id: 'dv-hotline',
    name: 'National Domestic Violence Hotline',
    phone: '1-800-799-7233',
    description: '24/7 confidential support for domestic violence survivors',
    color: '#EF4444',
  },
  {
    id: 'crisis-text',
    name: 'Crisis Text Line',
    sms: '741741',
    textMessage: 'HOME',
    description: 'Text HOME to 741741 for 24/7 crisis support',
    color: '#F59E0B',
  },
  {
    id: 'suicide-prevention',
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    description: '24/7 free and confidential support',
    color: '#EF4444',
  },
  {
    id: 'samhsa',
    name: 'SAMHSA National Helpline',
    phone: '1-800-662-4357',
    description: 'Mental health and substance abuse support (24/7)',
    color: '#8B5CF6',
  },
  {
    id: 'veterans',
    name: 'Veterans Crisis Line',
    phone: '1-800-273-8255',
    description: 'Press 1 after calling for veteran-specific support',
    color: '#059669',
  },
];

const LOCAL_RESOURCES = [
  {
    id: 'shelters',
    name: 'Find Local Shelters',
    description: 'Search for emergency shelters near you',
    action: 'search',
  },
  {
    id: 'legal-aid',
    name: 'Legal Aid Services',
    description: 'Free legal assistance for protective orders',
    action: 'search',
  },
  {
    id: 'counseling',
    name: 'Local Counseling Services',
    description: 'Mental health support in your area',
    action: 'search',
  },
];

export function CrisisScreen({ onQuickExit }) {
  const [isExiting, setIsExiting] = useState(false);

  async function handleCall(phone) {
    const telUrl = `tel:${phone.replace(/[^0-9]/g, '')}`;
    const canOpen = await Linking.canOpenURL(telUrl);

    if (canOpen) {
      Linking.openURL(telUrl);
    } else {
      Alert.alert(
        'Unable to call',
        `Please manually dial: ${phone}`,
        [{ text: 'OK' }]
      );
    }
  }

  async function handleText(number, message) {
    const smsUrl = Platform.select({
      ios: `sms:${number}&body=${message}`,
      android: `sms:${number}?body=${message}`,
    });

    const canOpen = await Linking.canOpenURL(smsUrl);

    if (canOpen) {
      Linking.openURL(smsUrl);
    } else {
      Alert.alert(
        'Unable to text',
        `Please manually text "${message}" to ${number}`,
        [{ text: 'OK' }]
      );
    }
  }

  function handleSearchLocal(resourceType) {
    // In production, this would integrate with Google Maps API or similar
    Alert.alert(
      'Find Resources',
      'This feature will help you find local resources near you. Coming soon.',
      [{ text: 'OK' }]
    );
  }

  function handleQuickExit() {
    Alert.alert(
      'Quick Exit',
      'This will close the app and clear recent history for your safety.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit Now',
          style: 'destructive',
          onPress: () => {
            setIsExiting(true);
            // In production: clear navigation history, close app
            if (onQuickExit) {
              onQuickExit();
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Crisis & Support Resources</Text>
          <Text style={styles.subheading}>
            You're not alone. Help is available 24/7.
          </Text>
        </View>

        {/* Quick Exit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.quickExitButton,
            pressed && styles.quickExitButtonPressed,
          ]}
          onPress={handleQuickExit}
        >
          <Text style={styles.quickExitText}>⚠️ Quick Exit</Text>
          <Text style={styles.quickExitCaption}>Leave app safely</Text>
        </Pressable>

        {/* Emergency Hotlines */}
        <Text style={styles.sectionTitle}>Emergency Hotlines</Text>
        {CRISIS_RESOURCES.map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={styles.resourceHeader}>
              <View style={[styles.colorDot, { backgroundColor: resource.color }]} />
              <Text style={styles.resourceName}>{resource.name}</Text>
            </View>
            <Text style={styles.resourceDescription}>{resource.description}</Text>

            {resource.phone && (
              <Pressable
                style={({ pressed }) => [
                  styles.contactButton,
                  pressed && styles.contactButtonPressed,
                ]}
                onPress={() => handleCall(resource.phone)}
              >
                <Text style={styles.contactButtonText}>📞 Call {resource.phone}</Text>
              </Pressable>
            )}

            {resource.sms && (
              <Pressable
                style={({ pressed }) => [
                  styles.contactButton,
                  styles.textButton,
                  pressed && styles.contactButtonPressed,
                ]}
                onPress={() => handleText(resource.sms, resource.textMessage)}
              >
                <Text style={styles.contactButtonText}>
                  💬 Text "{resource.textMessage}" to {resource.sms}
                </Text>
              </Pressable>
            )}
          </View>
        ))}

        {/* Local Resources */}
        <Text style={styles.sectionTitle}>Local Resources</Text>
        {LOCAL_RESOURCES.map((resource) => (
          <Pressable
            key={resource.id}
            style={({ pressed }) => [
              styles.localResourceCard,
              pressed && styles.localResourceCardPressed,
            ]}
            onPress={() => handleSearchLocal(resource.id)}
          >
            <Text style={styles.localResourceName}>{resource.name}</Text>
            <Text style={styles.localResourceDescription}>{resource.description}</Text>
            <Text style={styles.localResourceAction}>Search nearby →</Text>
          </Pressable>
        ))}

        {/* Safety Notice */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>🔒 Your Privacy</Text>
          <Text style={styles.safetyText}>
            All hotlines are confidential. Use the Quick Exit button if you need to leave the app
            quickly. Your reflections are saved and private.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 8,
    ...typography.header,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    ...typography.body,
  },
  quickExitButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  quickExitButtonPressed: {
    opacity: 0.8,
  },
  quickExitText: {
    fontSize: 20,
    color: '#EF4444',
    marginBottom: 4,
    ...typography.header,
  },
  quickExitCaption: {
    fontSize: 14,
    color: '#991B1B',
    ...typography.body,
  },
  sectionTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
    ...typography.header,
  },
  resourceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  resourceName: {
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
    ...typography.emphasis,
  },
  resourceDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
    ...typography.body,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  textButton: {
    backgroundColor: colors.secondary,
  },
  contactButtonPressed: {
    opacity: 0.85,
  },
  contactButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    ...typography.emphasis,
  },
  localResourceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localResourceCardPressed: {
    backgroundColor: '#F3F4F6',
  },
  localResourceName: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
    ...typography.emphasis,
  },
  localResourceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    ...typography.body,
  },
  localResourceAction: {
    fontSize: 14,
    color: colors.primary,
    ...typography.emphasis,
  },
  safetyNotice: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  safetyTitle: {
    fontSize: 16,
    color: '#047857',
    marginBottom: 8,
    ...typography.emphasis,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#065F46',
    ...typography.body,
  },
});
