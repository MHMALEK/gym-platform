import { Platform, TextStyle, ViewStyle } from "react-native";

export const colors = {
  primary: "#059669",
  primaryDark: "#047857",
  primaryLight: "#ecfdf5",
  primaryMuted: "#a7f3d0",
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  warning: "#d97706",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  success: "#059669",
  successBg: "#ecfdf5",
  info: "#2563eb",
  infoBg: "#eff6ff",
  overlay: "rgba(15, 23, 42, 0.04)",
  chatMine: "#059669",
  chatMineBg: "#d1fae5",
  chatTheirs: "#ffffff",
  heroGradientStart: "#047857",
  heroGradientEnd: "#059669",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  }),
  elevated: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

export const typography = {
  hero: { fontSize: 28, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.text, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: "400" as const, color: colors.textSecondary, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500" as const, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: "600" as const, color: colors.textSecondary },
  button: { fontSize: 16, fontWeight: "600" as const },
};

export function invoiceStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status.toLowerCase()) {
    case "paid":
      return { bg: colors.successBg, text: colors.success, border: colors.primaryMuted };
    case "overdue":
      return { bg: colors.dangerBg, text: colors.danger, border: colors.dangerBorder };
    case "cancelled":
      return { bg: colors.borderLight, text: colors.textMuted, border: colors.border };
    default:
      return { bg: colors.warningBg, text: colors.warning, border: colors.warningBorder };
  }
}

export function reminderSeverityStyle(severity: string): ViewStyle {
  if (severity === "high") {
    return { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder };
  }
  if (severity === "medium") {
    return { backgroundColor: colors.warningBg, borderColor: colors.warningBorder };
  }
  return { backgroundColor: colors.surface, borderColor: colors.border };
}
