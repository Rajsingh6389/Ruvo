import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '../context/ThemeContext';

/** Skeleton placeholder mimicking a shop card layout (§8). */
export const ShopSkeleton = ({ count = 4 }: { count?: number }) => {
  const { colors } = useTheme();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Skeleton width="100%" height={120} borderRadius={10} />
          <View style={styles.body}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            <View style={styles.row}>
              <Skeleton width={60} height={12} />
              <Skeleton width={50} height={12} />
            </View>
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
    overflow: 'hidden',
    marginBottom: 14,
  },
  body: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
