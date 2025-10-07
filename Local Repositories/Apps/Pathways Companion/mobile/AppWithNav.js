/**
 * Main App with Navigation (Prototype Mode - No Auth Required)
 * Simple tab-based navigation between Journal, Crisis, and Learning screens
 */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from './src/theme/colors';
import { TabBar } from './src/components/TabBar';
import { CrisisScreen } from './src/screens/CrisisScreen';
import { LearningScreen } from './src/screens/LearningScreen';

// Import the original journal screen content
import OriginalApp from './App';

export default function AppWithNav() {
  const [activeTab, setActiveTab] = useState('journal');

  function handleQuickExit() {
    // In a real app, this would:
    // 1. Navigate to a safe screen (weather app, etc.)
    // 2. Clear navigation history
    // 3. Optionally close the app
    console.log('Quick Exit triggered');
  }

  function renderScreen() {
    switch (activeTab) {
      case 'journal':
        return <OriginalApp />;
      case 'crisis':
        return <CrisisScreen onQuickExit={handleQuickExit} />;
      case 'learning':
        return <LearningScreen />;
      default:
        return <OriginalApp />;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>{renderScreen()}</View>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
