/**
 * RuVo Unified Design System
 * Shared components and patterns for RuvoPartner & RuvoShop
 * Modern, accessible, vibrant blue/purple palette (no dark green)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '../theme/radius';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Card
// ────────────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  colors: any;
  shadow?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, colors, shadow = 'md', style }) => (
  <View
    style={[
      s.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: RADIUS.card,
      },
      shadow === 'sm' && { elevation: 2 },
      shadow === 'md' && { elevation: 4 },
      shadow === 'lg' && { elevation: 8 },
      style,
    ]}
  >
    {children}
  </View>
);

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Button (Primary CTA)
// ────────────────────────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  colors: any;
  typography: any;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  colors,
  typography,
  style,
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const sizes = {
    sm: { height: 40, paddingHorizontal: 14 },
    md: { height: 48, paddingHorizontal: 20 },
    lg: { height: 56, paddingHorizontal: 24 },
  };

  const variants = {
    primary: {
      bg: disabled ? colors.disabled : colors.primary,
      text: colors.onPrimary,
      border: colors.primary,
    },
    secondary: {
      bg: colors.primarySoft,
      text: colors.primary,
      border: colors.primary,
    },
    outline: {
      bg: colors.surface,
      text: colors.primary,
      border: colors.border,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      border: 'transparent',
    },
  };

  const v = variants[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={[
          s.button,
          sizes[size],
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            borderRadius: RADIUS.button,
            borderWidth: variant === 'outline' ? 1.5 : 0,
          },
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <ActivityIndicator color={v.text} size="small" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={size === 'sm' ? 14 : 18} color={v.text} />}
            <Text
              style={[
                typography.button,
                {
                  color: v.text,
                  marginLeft: icon ? 8 : 0,
                },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Input Field
// ────────────────────────────────────────────────────────────────────────────
import { TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  error?: string;
  helper?: string;
  required?: boolean;
  colors: any;
  typography: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  helper,
  required,
  colors,
  typography,
  ...rest
}) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={s.inputContainer}>
      {label && (
        <Text
          style={[
            typography.label,
            s.label,
            { color: colors.textSecondary },
          ]}
        >
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <View
        style={[
          s.inputWrapper,
          {
            backgroundColor: colors.surfaceSunken,
            borderColor: error
              ? colors.error
              : focused
              ? colors.primary
              : colors.border,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textHint}
          />
        )}
        <TextInput
          {...rest}
          placeholderTextColor={colors.placeholder}
          style={[
            typography.body,
            s.input,
            { color: colors.textPrimary },
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle" size={12} color={colors.error} />
          <Text style={[typography.caption, { color: colors.error, marginLeft: 4 }]}>
            {error}
          </Text>
        </View>
      )}
      {helper && !error && (
        <Text style={[typography.caption, { color: colors.textHint, marginTop: 4 }]}>
          {helper}
        </Text>
      )}
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Alert Banner
// ────────────────────────────────────────────────────────────────────────────
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
  colors: any;
  typography: any;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  action,
  colors,
  typography,
}) => {
  const types = {
    success: {
      bg: colors.successSoft,
      icon: 'checkmark-circle' as const,
      color: colors.success,
    },
    error: {
      bg: colors.errorSoft,
      icon: 'alert-circle' as const,
      color: colors.error,
    },
    warning: {
      bg: colors.warningSoft,
      icon: 'warning' as const,
      color: colors.warning,
    },
    info: {
      bg: colors.infoSoft,
      icon: 'information-circle' as const,
      color: colors.info,
    },
  };

  const t = types[type];

  return (
    <View
      style={[
        s.alert,
        {
          backgroundColor: t.bg,
          borderRadius: RADIUS.md,
        },
      ]}
    >
      <Ionicons name={t.icon} size={20} color={t.color} />
      <View style={s.alertContent}>
        {title && (
          <Text style={[typography.label, { color: t.color }]}>
            {title}
          </Text>
        )}
        <Text
          style={[
            typography.body,
            {
              color: t.color,
              marginTop: title ? 2 : 0,
            },
          ]}
        >
          {message}
        </Text>
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[typography.bodyStrong, { color: t.color }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Badge
// ────────────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  colors: any;
  typography: any;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  icon,
  colors,
  typography,
  style,
}) => {
  const variants = {
    default: { bg: colors.surfaceSunken, fg: colors.textPrimary },
    success: { bg: colors.successSoft, fg: colors.success },
    error: { bg: colors.errorSoft, fg: colors.error },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
  };

  const v = variants[variant];
  const sizes = { sm: 16, md: 18 };

  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor: v.bg,
          paddingHorizontal: size === 'sm' ? 8 : 12,
          paddingVertical: size === 'sm' ? 4 : 6,
          borderRadius: RADIUS.pill,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons name={icon} size={size === 'sm' ? 12 : 14} color={v.fg} />
      )}
      <Text
        style={[
          typography.caption,
          {
            color: v.fg,
            fontSize: sizes[size],
            fontWeight: '600',
            marginLeft: icon ? 4 : 0,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Empty State
// ────────────────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  colors: any;
  typography: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  action,
  colors,
  typography,
}) => (
  <View style={s.emptyState}>
    <View
      style={[
        s.emptyIcon,
        {
          backgroundColor: colors.primarySoft,
          borderRadius: 48,
        },
      ]}
    >
      <Ionicons name={icon} size={40} color={colors.primary} />
    </View>
    <Text
      style={[
        typography.headingM,
        {
          color: colors.textPrimary,
          marginTop: 16,
          textAlign: 'center',
        },
      ]}
    >
      {title}
    </Text>
    {subtitle && (
      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 20,
          },
        ]}
      >
        {subtitle}
      </Text>
    )}
    {action && (
      <Button
        label={action.label}
        onPress={action.onPress}
        colors={colors}
        typography={typography}
        style={{ marginTop: 16 }}
      />
    )}
  </View>
);

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT: Header with Back Button
// ────────────────────────────────────────────────────────────────────────────
interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void };
  colors: any;
  typography: any;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  colors,
  typography,
}) => (
  <View
    style={[
      s.header,
      {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      },
    ]}
  >
    {onBack && (
      <TouchableOpacity
        onPress={onBack}
        style={[
          s.headerButton,
          { backgroundColor: colors.surfaceSunken },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
    )}
    <View style={{ flex: 1 }}>
      <Text
        style={[
          typography.headingM,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: 2 },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
    {rightAction && (
      <TouchableOpacity
        onPress={rightAction.onPress}
        style={[
          s.headerButton,
          { backgroundColor: colors.surfaceSunken },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={rightAction.icon}
          size={20}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
    )}
  </View>
);

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, overflow: 'hidden' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputContainer: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.input,
    height: 48,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: { flex: 1, padding: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  alertContent: { flex: 1 },

  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerButton: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
