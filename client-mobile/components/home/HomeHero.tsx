import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { ClientMe } from "@/lib/api";

type Props = {
  me: ClientMe;
  openInvoiceCount: number;
  reminderCount: number;
};

export function HomeHero({ me, openInvoiceCount, reminderCount }: Props) {
  return (
    <View style={styles.hero}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(me.name?.[0] ?? "?").toUpperCase()}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{me.name}</Text>
        </View>
      </View>

      <View style={styles.coachCard}>
        <View style={styles.coachIcon}>
          <Ionicons name="fitness-outline" size={20} color="#fff" />
        </View>
        <View style={styles.coachText}>
          <Text style={styles.coachLabel}>Your coach</Text>
          <Text style={styles.coachName}>{me.coach_name}</Text>
          {me.coach_tagline ? <Text style={styles.tagline}>{me.coach_tagline}</Text> : null}
        </View>
      </View>

      <View style={styles.chips}>
        <Badge label={me.status} tone="success" />
        {openInvoiceCount > 0 ? (
          <Badge label={`${openInvoiceCount} open invoice${openInvoiceCount > 1 ? "s" : ""}`} tone="warning" />
        ) : null}
        {reminderCount > 0 ? (
          <Badge label={`${reminderCount} reminder${reminderCount > 1 ? "s" : ""}`} tone="info" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  meta: { flex: 1 },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  name: { fontSize: 24, fontWeight: "700", color: "#fff", letterSpacing: -0.3 },
  coachCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  coachText: { flex: 1 },
  coachLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 },
  coachName: { fontSize: 17, fontWeight: "700", color: "#fff", marginTop: 2 },
  tagline: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
});
