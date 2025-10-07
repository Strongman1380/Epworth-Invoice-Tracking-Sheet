import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function EmotionTag({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.activeChip,
        pressed && styles.pressedChip,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  pressedChip: {
    opacity: 0.8,
  },
  activeChip: {
    borderColor: colors.primary,
    backgroundColor: '#ECEBFF',
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    ...typography.emphasis,
  },
  activeText: {
    color: colors.primary,
  },
});
