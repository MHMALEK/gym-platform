import { StyleSheet, Text, View } from "react-native";

import { colors, invoiceStatusColor, radii, spacing } from "@/constants/theme";

type Props = {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "invoice";
  status?: string;
};

export function Badge({ label, tone = "default", status }: Props) {
  const invoiceStyle = status ? invoiceStatusColor(status) : null;
  const toneStyle =
    tone === "invoice" && invoiceStyle
      ? { backgroundColor: invoiceStyle.bg, borderColor: invoiceStyle.border }
      : toneStyles[tone] ?? toneStyles.default;
  const textColor =
    tone === "invoice" && invoiceStyle ? invoiceStyle.text : textColors[tone] ?? colors.textSecondary;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  default: { backgroundColor: colors.borderLight, borderColor: colors.border },
  success: { backgroundColor: colors.successBg, borderColor: colors.primaryMuted },
  warning: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  info: { backgroundColor: colors.infoBg, borderColor: "#bfdbfe" },
  invoice: {},
});

const textColors: Record<string, string> = {
  default: colors.textSecondary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
