/**
 * OnboardingShared - RuvoPartner (Redesigned)
 * Premium shared primitives used by all 7 onboarding steps.
 * Replaces StyleSheet.create() with inline styles for consistency.
 * All exported component signatures preserved for drop-in compatibility.
 */

import React from 'react';
import { StyleSheet, View,
  Text,
  TouchableOpacity,
  TextInput,
  TextInputProps,
  ActivityIndicator,
  Animated, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '../../theme/radius';
import { useTheme } from '../../context/ThemeContext';

// ── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_STEPS = 6;

export const STEP_META = [
  { icon: 'person-outline'             as const, label: 'Details' },
  { icon: 'car-outline'                as const, label: 'Vehicle' },
  { icon: 'wallet-outline'             as const, label: 'Fee' },
  { icon: 'card-outline'               as const, label: 'Bank' },
  { icon: 'storefront-outline'         as const, label: 'Shops' },
  { icon: 'checkmark-circle-outline'   as const, label: 'Done' },
];

const ACCENT  = '#16A34A';
const ACCENT_SOFT = '#DCFCE7';

// ── Step Progress Bar ─────────────────────────────────────────────────────────

interface StepBarProps {
  current: number;
  colors: any;
  typography: any;
}

export const StepBar: React.FC<StepBarProps> = ({ current, colors: propColors }) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  return (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 }}>
    {STEP_META.map((step, i) => {
      const stepNum = i + 1;
      const done   = stepNum < current;
      const active = stepNum === current;
      return (
        <React.Fragment key={step.label}>
          <View style={{ alignItems: 'center', width: 38 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              borderWidth: 1.5,
              backgroundColor: done ? colors.primary : active ? colors.primary : colors.surfaceSunken,
              borderColor:     done ? colors.primary : active ? colors.primary : colors.border,
              alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              {done
                ? <Ionicons name="checkmark" size={13} color={colors.onPrimary} />
                : <Ionicons name={step.icon} size={12} color={active ? colors.onPrimary : colors.textHint} />
              }
            </View>
            <Text style={{
              fontSize: 9, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', letterSpacing: 0.3,
              color: active ? colors.primary : done ? colors.textPrimary : colors.textHint,
            }} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
          {i < STEP_META.length - 1 && (
            <View style={{
              flex: 1, height: 1.5, marginTop: 13, borderRadius: 1,
              backgroundColor: done ? colors.primary : colors.border,
            }} />
          )}
        </React.Fragment>
      );
    })}
  </View>
)};

// ── Screen Header ─────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  // Legacy props from old OnboardingShared – accepted but ignored
  icon?: string;
  colors?: any;
  typography?: any;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack }) => {
  const { colors } = useTheme();
  return (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
    {onBack && (
      <TouchableOpacity
        onPress={onBack}
        style={{ width: 36, height: 36, backgroundColor: colors.surfaceSunken, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
    )}
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: colors.textPrimary }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: 'Poppins_500Medium' }}>{subtitle}</Text>}
    </View>
  </View>
)};

// ── Section Card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  children: React.ReactNode;
  colors?: any;
  style?: any;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, style }) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  return (
  <View style={[{
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 12,
    shadowColor: isDark ? '#000' : '#2E2313',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  }, style]}>
    {children}
  </View>
)};

// ── Field Label ───────────────────────────────────────────────────────────────

interface FieldLabelProps {
  text: string;
  required?: boolean;
  colors?: any;
  typography?: any;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ text, required }) => {
  const { colors } = useTheme();
  return (
  <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: colors.textSecondary, marginBottom: 6, marginTop: 4, letterSpacing: 0.4 }}>
    {text}
    {required && <Text style={{ color: colors.error }}> *</Text>}
  </Text>
)};

// ── Styled Input ──────────────────────────────────────────────────────────────

interface StyledInputProps extends TextInputProps {
  focused?: boolean;
  colors?: any;
  typography?: any;
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
}

export const StyledInput: React.FC<StyledInputProps> = ({
  focused, iconLeft, style, ...rest
}) => {
  const { colors } = useTheme();
  return (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    borderWidth: focused ? 2 : 1.5,
    borderRadius: RADIUS.input,
    height: 48,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: colors.surfaceSunken,
    borderColor: focused ? colors.primary : colors.border,
  }}>
    {iconLeft && (
      <Ionicons name={iconLeft} size={18} color={focused ? colors.primary : colors.textHint} />
    )}
    <TextInput
      {...rest}
      placeholderTextColor={colors.textHint}
      style={[{ flex: 1, padding: 0, fontSize: 15, color: colors.textPrimary, fontFamily: 'Poppins_500Medium' }, style]}
    />
  </View>
)};

// ── CTA Button ────────────────────────────────────────────────────────────────

interface CtaBtnProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors?: any;
  typography?: any;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export const CtaBtn: React.FC<CtaBtnProps> = ({ label, onPress, loading, disabled, icon }) => {
  const { colors } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={loading || disabled}
        activeOpacity={1}
        style={{
          backgroundColor: colors.primary,
          borderRadius: RADIUS.button,
          paddingVertical: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.6 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <Text style={{ color: colors.onPrimary, fontSize: 16, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 0.3 }}>
              {label}
            </Text>
            {icon && <Ionicons name={icon} size={18} color={colors.onPrimary} />}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Error Box ─────────────────────────────────────────────────────────────────

interface ErrorBoxProps {
  message?: string | null;
  // Legacy alias used by existing step files
  error?: string | null;
  colors?: any;
  typography?: any;
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, error }) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const text = message ?? error;
  if (!text) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: colors.errorSoft, borderRadius: 10,
      padding: 12, marginVertical: 8,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.error,
    }}>
      <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: isDark ? colors.textPrimary : colors.error, fontSize: 13, fontFamily: 'Poppins_600SemiBold', lineHeight: 19 }}>
        {text}
      </Text>
    </View>
  );
};

// ── Info Box ──────────────────────────────────────────────────────────────────

interface InfoBoxProps {
  message?: string;
  // Legacy alias used by existing step files
  text?: string;
  // Legacy variant prop – accepted but ignored (we always render the same style)
  variant?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  colors?: any;
  typography?: any;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ message, text, icon = 'information-circle-outline' }) => {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const content = message ?? text ?? '';
  return (
  <View style={{
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.accentSoft, borderRadius: 10,
    padding: 12, marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.success,
  }}>
    <Ionicons name={icon} size={16} color={colors.success} style={{ marginTop: 1 }} />
    <Text style={{ flex: 1, color: isDark ? colors.textPrimary : '#14532D', fontSize: 13, fontFamily: 'Poppins_500Medium', lineHeight: 19 }}>
      {content}
    </Text>
  </View>
  );
};
