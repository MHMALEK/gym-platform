import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, type PressableProps } from "react-native";

import { colors, radii, spacing, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.full,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  full: { alignSelf: "stretch" },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: colors.primaryLight },
  danger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },
  label: { ...typography.button },
  primaryLabel: { color: "#fff" },
  secondaryLabel: { color: colors.text },
  ghostLabel: { color: colors.primaryDark },
  dangerLabel: { color: colors.danger },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
});
