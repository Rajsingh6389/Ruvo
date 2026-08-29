import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '../context/ThemeContext';

/** Skeleton placeholder mimicking an order card shape (§8). */
export const OrderSkeleton = ({ count = 3 }: { count?: number }) => {
  const { colors } = useTheme();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={14} />
          </View>
          <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
          <View style={styles.row}>
            <Skeleton width={80} height={12} />
            <Skeleton width={90} height={32} borderRadius={8} />
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});
