/**
 * Shared primitives used by every onboarding step in RuVo Partner.
 * Keeps individual step files lean and consistent.
 * Uses unified design system.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '../../theme/radius';

export const TOTAL_STEPS = 7;

export const STEP_META = [
  { icon: 'person-outline' as const, label: 'Details' },
  { icon: 'car-outline' as const, label: 'Vehicle' },
  { icon: 'card-outline' as const, label: 'Aadhaar' },
  { icon: 'wallet-outline' as const, label: 'Fee' },
  { icon: 'card-outline' as const, label: 'Bank' },
  { icon: 'storefront-outline' as const, label: 'Shops' },
  { icon: 'checkmark-circle-outline' as const, label: 'Done' },
];

// ── Step Progress Bar ────────────────────────────────────────────────────────
interface StepBarProps {
  current: number;
  colors: any;
  typography: any;
}

export const StepBar: React.FC<StepBarProps> = ({ current, colors, typography }) => (
  <View style={sb.wrap}>
    {STEP_META.map((step, i) => {
      const stepNum = i + 1;
      const done = stepNum < current;
      const active = stepNum === current;
      return (
        <React.Fragment key={step.label}>
          <View style={sb.stepCol}>
            <View
              style={[
                sb.circle,
                {
                  backgroundColor: done || active ? colors.primary : colors.surfaceSunken,
                  borderColor: done || active ? colors.primary : colors.border,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={step.icon}
                  size={12}
                  color={done || active ? '#FFFFFF' : colors.textHint}
                />
              )}
            </View>
            <Text
              style={[
                typography.caption,
                sb.label,
                {
                  color: active ? colors.primary : done ? colors.textSecondary : colors.textHint,
                },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
          {i < STEP_META.length - 1 && (
            <View style={[sb.line, { backgroundColor: done ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 14 },
  stepCol: { alignItems: 'center', width: 48 },
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  line: { flex: 1, height: 1.5, marginTop: 13, borderRadius: 1 },
  label: { fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
});

// ── Section Card ─────────────────────────────────────────────────────────────
interface SectionCardProps {
  children: React.ReactNode;
  colors: any;
  style?: any;
}
export const SectionCard: React.FC<SectionCardProps> = ({ children, colors, style }) => (
  <View
    style={[
      sc.card,
      { backgroundColor: colors.card, borderColor: colors.border },
      style,
    ]}
  >
    {children}
  </View>
);
const sc = StyleSheet.create({
  card: { borderRadius: RADIUS.card, borderWidth: 1, padding: 16, marginBottom: 12 },
});

// ── Field label ───────────────────────────────────────────────────────────────
interface FieldLabelProps {
  text: string;
  required?: boolean;
  colors: any;
  typography: any;
}
export const FieldLabel: React.FC<FieldLabelProps> = ({ text, required, colors, typography }) => (
  <Text style={[typography.label, fl.label, { color: colors.textSecondary }]}>
    {text}
    {required ? <Text style={{ color: colors.error }}> *</Text> : null}
  </Text>
);
const fl = StyleSheet.create({
  label: { marginBottom: 6, marginTop: 4, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});

// ── Styled TextInput wrapper ──────────────────────────────────────────────────
import { TextInput, TextInputProps } from 'react-native';
interface StyledInputProps extends TextInputProps {
  focused?: boolean;
  colors: any;
  typography: any;
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
}
export const StyledInput: React.FC<StyledInputProps> = ({
  focused,
  colors,
  typography,
  iconLeft,
  style,
  ...rest
}) => (
  <View
    style={[
      inp.wrap,
      {
        backgroundColor: colors.surfaceSunken,
        borderColor: focused ? colors.primary : colors.border,
      },
      focused && inp.focused,
    ]}
  >
    {iconLeft && (
      <Ionicons
        name={iconLeft}
        size={18}
        color={focused ? colors.primary : colors.textHint}
        style={inp.icon}
      />
    )}
    <TextInput
      {...rest}
      placeholderTextColor={colors.placeholder}
      style={[typography.body, inp.input, { color: colors.textPrimary }, style]}
    />
  </View>
);
const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.input, height: 48, paddingHorizontal: 12, gap: 10 },
  focused: { borderWidth: 2 },
  icon: { flexShrink: 0 },
  input: { flex: 1, padding: 0 },
});

// ── Primary CTA Button ────────────────────────────────────────────────────────
interface CtaBtnProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors: any;
  typography: any;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}
export const CtaBtn: React.FC<CtaBtnProps> = ({
  label,
  onPress,
  loading,
  disabled,
  colors,
  typography,
  icon,
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          btn.btn,
          {
            backgroundColor: disabled || loading ? colors.disabled : colors.primary,
            borderRadius: RADIUS.button,
          },
        ]}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <Ionicons name="sync" size={20} color="#FFFFFF" />
        ) : (
          <>
            <Text style={[typography.button, { color: '#FFFFFF' }]}>{label}</Text>
            {icon && <Ionicons name={icon} size={18} color="#FFFFFF" />}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
const btn = StyleSheet.create({
  btn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

// ── Info banner ───────────────────────────────────────────────────────────────
interface InfoBoxProps {
  text: string;
  colors: any;
  typography: any;
  variant?: 'info' | 'success' | 'warning';
}
export const InfoBox: React.FC<InfoBoxProps> = ({ text, colors, typography, variant = 'info' }) => {
  const variants = {
    info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle-outline' as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' as const },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning-outline' as const },
  };
  const v = variants[variant];
  return (
    <View style={[ib.box, { backgroundColor: v.bg, borderRadius: RADIUS.sm }]}>
      <Ionicons name={v.icon} size={16} color={v.fg} />
      <Text style={[typography.caption, { color: v.fg, flex: 1, lineHeight: 18 }]}>{text}</Text>
    </View>
  );
};
const ib = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12 },
});

// ── Error box ─────────────────────────────────────────────────────────────────
interface ErrorBoxProps {
  error: string | null;
  colors: any;
  typography: any;
}
export const ErrorBox: React.FC<ErrorBoxProps> = ({ error, colors, typography }) => {
  if (!error) return null;
  return (
    <View style={[eb.box, { backgroundColor: colors.errorSoft, borderRadius: RADIUS.sm }]}>
      <Ionicons name="alert-circle" size={15} color={colors.error} />
      <Text style={[typography.caption, { color: colors.error, flex: 1 }]}>{error}</Text>
    </View>
  );
};
const eb = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginBottom: 14 },
});

// ── Screen header ─────────────────────────────────────────────────────────────
interface ScreenHeaderProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  colors: any;
  typography: any;
  onBack?: () => void;
}
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  icon,
  title,
  subtitle,
  colors,
  typography,
  onBack,
}) => (
  <View style={hdr.wrap}>
    {onBack && (
      <TouchableOpacity
        onPress={onBack}
        style={[hdr.backBtn, { backgroundColor: colors.surfaceSunken, borderRadius: RADIUS.sm }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
    )}
    <View style={[hdr.iconBox, { backgroundColor: colors.primarySoft, borderRadius: RADIUS.md }]}>
      <Ionicons name={icon} size={28} color={colors.primary} />
    </View>
    <Text style={[typography.headingL, hdr.title, { color: colors.textPrimary }]}>{title}</Text>
    <Text style={[typography.body, hdr.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
  </View>
);
const hdr = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { marginBottom: 4 },
  subtitle: { lineHeight: 20, marginBottom: 16 },
});
