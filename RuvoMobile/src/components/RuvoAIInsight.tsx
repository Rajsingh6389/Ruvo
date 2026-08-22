import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/** A subtle, reusable explanation of how RuVo AI is helping—not deciding for—the customer. */
export const RuVoAIIcon = () => <Text accessibilityLabel="RuVo AI" style={styles.spark}>✦</Text>;

export const RuVoAIInsight = ({ title, detail, style, ...props }: ViewProps & { title: string; detail: string }) => {
  const { colors } = useTheme();
  return <View {...props} style={[styles.card, { borderColor: colors.ai, backgroundColor: colors.primarySoft }, style]}>
    <RuVoAIIcon />
    <View style={styles.copy}><Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text><Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text></View>
  </View>;
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  spark: { color: '#715BC6', fontSize: 22, lineHeight: 24 }, copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 }, detail: { fontSize: 12, lineHeight: 17 },
});
