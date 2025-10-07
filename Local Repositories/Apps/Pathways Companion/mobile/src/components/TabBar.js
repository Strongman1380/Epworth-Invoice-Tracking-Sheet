/**
 * Simple Tab Navigation Bar
 * Allows switching between main app screens
 */
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function TabBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'journal', label: 'Journal', icon: '📝' },
    { id: 'crisis', label: 'Support', icon: '🆘' },
    { id: 'learning', label: 'Learn', icon: '📚' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.activeTab,
              pressed && styles.pressedTab,
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#ECEBFF',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  pressedTab: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    ...typography.emphasis,
  },
  activeLabel: {
    color: colors.primary,
  },
});
