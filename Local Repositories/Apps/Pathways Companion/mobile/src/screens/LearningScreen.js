/**
 * Learning Hub Screen (Coming Soon)
 * Will contain Power & Control Wheel and educational content
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function LearningScreen() {
  const upcomingFeatures = [
    {
      title: 'Power & Control Wheel',
      description: 'Interactive exploration of the Duluth Model wheels',
      status: 'Coming Soon',
    },
    {
      title: 'Equality Wheel',
      description: 'Learn about healthy relationship dynamics',
      status: 'Coming Soon',
    },
    {
      title: 'Micro Lessons',
      description: 'Short educational content on each wheel segment',
      status: 'Coming Soon',
    },
    {
      title: 'Self-Check Quizzes',
      description: 'Test your understanding with reflection-based questions',
      status: 'Coming Soon',
    },
    {
      title: 'Progress Tracking',
      description: 'See your learning journey and completed segments',
      status: 'Coming Soon',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>Learning Hub</Text>
          <Text style={styles.subheading}>
            Educational resources and reflection tools based on the Duluth Model
          </Text>
        </View>

        <View style={styles.bannerCard}>
          <Text style={styles.bannerIcon}>🚧</Text>
          <Text style={styles.bannerTitle}>Under Construction</Text>
          <Text style={styles.bannerText}>
            We're building interactive learning modules to support your growth. Check back soon!
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Features</Text>

        {upcomingFeatures.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{feature.status}</Text>
              </View>
            </View>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Focus on your daily reflections while we complete this module. Your journal entries are
            building valuable awareness.
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
  bannerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  bannerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 20,
    color: '#92400E',
    marginBottom: 8,
    ...typography.header,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#78350F',
    textAlign: 'center',
    ...typography.body,
  },
  sectionTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
    ...typography.header,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    ...typography.emphasis,
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#1E40AF',
    ...typography.emphasis,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    ...typography.body,
  },
  footerNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#065F46',
    ...typography.body,
  },
});
