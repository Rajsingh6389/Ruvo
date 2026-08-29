import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

const SKELETON_CARD_BG = '#FFFFFF';
const SKELETON_BORDER = '#E5E7EB';

/** Skeleton placeholder mimicking a product card / grid item (§8). */
export const ProductSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: SKELETON_CARD_BG, borderColor: SKELETON_BORDER }]}>
          <Skeleton width="100%" height={100} borderRadius={8} />
          <View style={styles.body}>
            <Skeleton width="80%" height={13} />
            <Skeleton width="50%" height={11} style={{ marginTop: 6 }} />
            <Skeleton width={60} height={24} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    width: '47%',
  },
  body: {
    padding: 10,
  },
});
