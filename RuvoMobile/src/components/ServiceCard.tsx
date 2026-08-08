import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ServiceCardProps {
  title: string;
  icon: string;
  implemented: boolean;
  onPress: () => void;
}

export const ServiceCard = ({ title, icon, implemented, onPress }: ServiceCardProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, shadowColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {!implemented && (
        <View style={[styles.badge, { backgroundColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>Coming Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '47%',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 130,
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

