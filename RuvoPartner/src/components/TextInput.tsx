import React, { useState } from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const TextInput = ({ label, error, leadingIcon, trailingIcon, style, ...props }: InputProps) => {
  const { colors, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: props.editable === false ? colors.disabled : colors.card,
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
          },
          style,
        ]}
      >
        {leadingIcon && <View style={styles.iconContainer}>{leadingIcon}</View>}
        <RNTextInput
          style={[
            styles.input,
            typography.bodyLarge,
            { color: props.editable === false ? colors.disabledText : colors.textPrimary }
          ]}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {trailingIcon && <View style={styles.iconContainer}>{trailingIcon}</View>}
      </View>
      {error && (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
  },
});
