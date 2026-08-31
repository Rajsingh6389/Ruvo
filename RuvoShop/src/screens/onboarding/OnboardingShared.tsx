/**
 * OnboardingShared - RuvoShop (Redesigned)
 * Premium shared primitives used by all onboarding steps.
 * Replaces StyleSheet.create() with inline styles for consistency.
 * All exported component signatures preserved for drop-in compatibility.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  TextInputProps,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '../../theme/radius';

// ── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_STEPS = 4;

export const STEP_META = [
  { icon: 'storefront-outline'           as const, label: 'Details' },
  { icon: 'card-outline'                 as const, label: 'Aadhaar' },
  { icon: 'wallet-outline'               as const, label: 'Bank' },
  { icon: 'checkmark-circle-outline'     as const, label: 'Done' },
];

const ACCENT      = '#F5B700';
const ACCENT_TEXT = '#231C10';
const ACCENT_SOFT = '#FEF9E6';

// ── Step Progress Bar ─────────────────────────────────────────────────────────

interface StepBarProps {
  current: number;
  colors: any;
  typography: any;
}

export const StepBar: React.FC<StepBarProps> = ({ current }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 }}>
    {STEP_META.map((step, i) => {
      const stepNum = i + 1;
      const done   = stepNum < current;
      const active = stepNum === current;
      return (
        <React.Fragment key={step.label}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              borderWidth: 1.5,
              backgroundColor: done ? ACCENT : active ? ACCENT : '#F0ECE7',
              borderColor:     done ? ACCENT : active ? ACCENT : '#D1C7BA',
              alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              {done
                ? <Ionicons name="checkmark" size={13} color={ACCENT_TEXT} />
                : <Ionicons name={step.icon} size={12} color={active ? ACCENT_TEXT : '#A79E92'} />
              }
            </View>
            <Text style={{
              fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3,
              color: active ? '#A07800' : done ? '#6B5E52' : '#A79E92',
            }} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
          {i < STEP_META.length - 1 && (
            <View style={{
              flex: 1, height: 1.5, marginTop: 13, borderRadius: 1,
              backgroundColor: done ? ACCENT : '#E5DDD5',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ── Screen Header ─────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onBack?: () => void;
  colors?: any;
  typography?: any;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, icon, onBack }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}>
    {onBack && (
      <TouchableOpacity
        onPress={onBack}
        style={{ width: 36, height: 36, backgroundColor: '#F0ECE7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="arrow-back" size={20} color="#231C10" />
      </TouchableOpacity>
    )}
    {icon && (
      <View style={{ width: 36, height: 36, backgroundColor: ACCENT_SOFT, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color="#A07800" />
      </View>
    )}
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#231C10' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: '#6B5E52', marginTop: 2, fontWeight: '500' }}>{subtitle}</Text>}
    </View>
  </View>
);

// ── Section Card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  children: React.ReactNode;
  colors?: any;
  style?: any;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, style }) => (
  <View style={[{
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE4D8',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#2E2313',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  }, style]}>
    {children}
  </View>
);

// ── Field Label ───────────────────────────────────────────────────────────────

interface FieldLabelProps {
  text: string;
  required?: boolean;
  colors?: any;
  typography?: any;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ text, required }) => (
  <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B5E52', marginBottom: 6, marginTop: 4, letterSpacing: 0.4 }}>
    {text}
    {required && <Text style={{ color: '#DC2626' }}> *</Text>}
  </Text>
);

// ── Styled Input ──────────────────────────────────────────────────────────────

interface StyledInputProps extends TextInputProps {
  focused?: boolean;
  colors?: any;
  typography?: any;
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
}

export const StyledInput: React.FC<StyledInputProps> = ({
  focused, iconLeft, style, ...rest
}) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    borderWidth: focused ? 2 : 1.5,
    borderRadius: RADIUS.input,
    height: 48,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: '#FAF7F3',
    borderColor: focused ? ACCENT : '#D1C7BA',
  }}>
    {iconLeft && (
      <Ionicons name={iconLeft} size={18} color={focused ? '#A07800' : '#A79E92'} />
    )}
    <TextInput
      {...rest}
      placeholderTextColor="#C4B9B0"
      style={[{ flex: 1, padding: 0, fontSize: 15, color: '#231C10', fontWeight: '500' }, style]}
    />
  </View>
);

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
          backgroundColor: ACCENT,
          borderRadius: RADIUS.button,
          paddingVertical: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.6 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color={ACCENT_TEXT} />
        ) : (
          <>
            <Text style={{ color: ACCENT_TEXT, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 }}>
              {label}
            </Text>
            {icon && <Ionicons name={icon} size={18} color={ACCENT_TEXT} />}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Error Message Formatter ───────────────────────────────────────────────────

export const formatErrorMessage = (err: any): string => {
  if (!err) return '';
  let str = '';
  if (typeof err === 'string') {
    str = err.trim();
  } else if (err.message && typeof err.message === 'string') {
    str = err.message.trim();
  } else if (err.error && typeof err.error === 'string') {
    str = err.error.trim();
  } else {
    try {
      str = JSON.stringify(err);
    } catch {
      return 'An unexpected error occurred.';
    }
  }

  // If str is a JSON object string like {"success":false,"message":"..."}, extract message
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed?.message && typeof parsed.message === 'string') {
        return parsed.message;
      }
      if (parsed?.error && typeof parsed.error === 'string') {
        return parsed.error;
      }
    } catch {
      /* Fallback to raw string if JSON parsing fails */
    }
  }
  return str;
};

// ── Error Box ─────────────────────────────────────────────────────────────────

interface ErrorBoxProps {
  message?: string | null;
  error?: string | null;
  colors?: any;
  typography?: any;
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message, error }) => {
  const rawContent = message ?? error;
  const content = formatErrorMessage(rawContent);
  if (!content) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: '#FEE2E2', borderRadius: 10,
      padding: 12, marginVertical: 8,
      borderWidth: 1, borderColor: '#FCA5A5',
    }}>
      <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: '#B91C1C', fontSize: 13, fontWeight: '600', lineHeight: 19 }}>
        {content}
      </Text>
    </View>
  );
};

// ── Info Box ──────────────────────────────────────────────────────────────────

interface InfoBoxProps {
  message?: string;
  text?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  variant?: 'info' | 'success' | 'warning';
  colors?: any;
  typography?: any;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ message, text, icon = 'information-circle-outline' }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: ACCENT_SOFT, borderRadius: 10,
    padding: 12, marginVertical: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  }}>
    <Ionicons name={icon} size={16} color="#A07800" style={{ marginTop: 1 }} />
    <Text style={{ flex: 1, color: '#78350F', fontSize: 13, fontWeight: '500', lineHeight: 19 }}>
      {message ?? text}
    </Text>
  </View>
);
