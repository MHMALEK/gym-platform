import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function SectionHeader({ title, actionLabel, onAction, icon }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={styles.icon} /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  icon: { marginRight: spacing.sm },
  title: { ...typography.subtitle, fontSize: 17 },
  action: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
