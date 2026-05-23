import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/constants/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  accent?: string;
};

export function QuickActionTile({ icon, label, subtitle, onPress, accent = colors.primaryLight }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, shadows.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.92 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  label: { ...typography.subtitle, fontSize: 15 },
  subtitle: { ...typography.caption, marginTop: 2 },
});

export function QuickActionGrid({ children }: { children: ReactNode }) {
  return <View style={gridStyles.grid}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
