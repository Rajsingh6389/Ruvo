/**
 * RuvoEmptyState — Universal Empty State Component
 * 
 * Premium empty states with illustrations
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RuvoButton } from './RuvoButton';
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
} from '../tokens';

export interface RuvoEmptyStateProps {
  /** Illustration image source */
  image?: string;
  /** Icon if no image provided */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon size */
  iconSize?: number;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Secondary action label */
  secondaryActionLabel?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Custom container style */
  style?: ViewStyle;
}

export const RuvoEmptyState: React.FC<RuvoEmptyStateProps> = ({
  image,
  icon,
  iconSize = 80,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Illustration / Icon */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : icon ? (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={iconSize}
              color={RuvoQuickColors.textTertiary}
            />
          </View>
        ) : null}
      </View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <RuvoButton
              onPress={onAction}
              variant="primary"
              size="large"
            >
              {actionLabel}
            </RuvoButton>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <RuvoButton
              onPress={onSecondaryAction}
              variant="outline"
              size="large"
            >
              {secondaryActionLabel}
            </RuvoButton>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Pre-built empty state variants
 */

export const RuvoEmptyCart: React.FC<{
  onBrowse?: () => void;
}> = ({ onBrowse }) => (
  <RuvoEmptyState
    icon="cart-outline"
    title="Your cart is empty"
    description="Browse products and add items to get started"
    actionLabel="Browse Products"
    onAction={onBrowse}
  />
);

export const RuvoEmptyOrders: React.FC<{
  onBrowse?: () => void;
}> = ({ onBrowse }) => (
  <RuvoEmptyState
    icon="receipt-outline"
    title="No orders yet"
    description="You haven't placed any orders yet"
    actionLabel="Start Shopping"
    onAction={onBrowse}
  />
);

export const RuvoEmptySearch: React.FC<{
  query?: string;
  onClear?: () => void;
}> = ({ query, onClear }) => (
  <RuvoEmptyState
    icon="search-outline"
    title={query ? `No results for "${query}"` : 'No results found'}
    description="Try adjusting your search or filters"
    actionLabel={query ? 'Clear Search' : undefined}
    onAction={onClear}
  />
);

export const RuvoNoConnection: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => (
  <RuvoEmptyState
    icon="cloud-offline-outline"
    iconSize={96}
    title="No internet connection"
    description="Please check your connection and try again"
    actionLabel="Retry"
    onAction={onRetry}
  />
);

export const RuvoError: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({
  title = 'Something went wrong',
  description = 'We encountered an error. Please try again.',
  onRetry,
}) => (
  <RuvoEmptyState
    icon="alert-circle-outline"
    iconSize={96}
    title={title}
    description={description}
    actionLabel="Try Again"
    onAction={onRetry}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RuvoSemanticSpacing.screenPaddingX * 2,
    paddingVertical: RuvoSemanticSpacing.screenPaddingY * 2,
  },
  imageContainer: {
    marginBottom: RuvoSemanticSpacing.sectionSpacing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: RuvoQuickColors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: RuvoSemanticSpacing.sectionSpacing,
  },
  title: {
    ...RuvoTypography.h3,
    color: RuvoQuickColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    ...RuvoTypography.body,
    color: RuvoQuickColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'stretch',
  },
});
