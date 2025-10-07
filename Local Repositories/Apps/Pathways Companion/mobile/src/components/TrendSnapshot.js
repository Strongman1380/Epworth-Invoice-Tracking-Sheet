import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DEFAULT_TREND = [
  { emotion: 'Calm', count: 4 },
  { emotion: 'Awareness', count: 3 },
  { emotion: 'Hope', count: 2 },
  { emotion: 'Anger', count: 1 },
];

export function TrendSnapshot({ data = DEFAULT_TREND }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <View style={styles.container} accessibilityRole="summary">
      <Text style={styles.heading}>Trend preview</Text>
      <Text style={styles.caption}>
        Emotion frequency over the past week. Tap “View trends” for full chart.
      </Text>
      {data.map((item) => (
        <View key={item.emotion} style={styles.row}>
          <Text style={styles.label}>{item.emotion}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${(item.count / max) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.value}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
    ...typography.emphasis,
  },
  caption: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 90,
    fontSize: 14,
    color: colors.textSecondary,
    ...typography.body,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 8,
    backgroundColor: colors.muted,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  value: {
    width: 24,
    fontSize: 14,
    textAlign: 'right',
    color: colors.textSecondary,
  },
});
