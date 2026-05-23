import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { ClientCoachingPlan } from "@/lib/api";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type Props = {
  plan: ClientCoachingPlan | undefined;
};

export function WorkoutPlanView({ plan }: Props) {
  const router = useRouter();

  if (!plan) {
    return <EmptyState icon="barbell-outline" title="Loading plan…" />;
  }

  const items = plan.workout_items ?? [];
  const hasContent =
    Boolean(plan.workout_plan?.trim()) ||
    Boolean(plan.workout_rich_html?.trim()) ||
    items.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon="barbell-outline"
        title="No workout yet"
        message="Your coach will assign your training program here."
      />
    );
  }

  const notes = plan.workout_rich_html ? stripHtml(plan.workout_rich_html) : (plan.workout_plan ?? "");

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.actions}>
        <Button label="Log workout" onPress={() => router.push("/(tabs)/plans/log")} style={styles.actionBtn} />
        <Button
          label="History"
          variant="secondary"
          onPress={() => router.push("/(tabs)/plans/history")}
          style={styles.actionBtn}
        />
      </View>

      <View style={styles.venuePill}>
        <Text style={styles.venueText}>{plan.program_venue.replace(/_/g, " ")}</Text>
      </View>
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}
      {items.map((item, idx) => (
        <View key={`${item.exercise_id}-${idx}`} style={styles.row}>
          <View style={styles.index}>
            <Text style={styles.indexText}>{idx + 1}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.exName}>{item.exercise_name ?? `Exercise #${item.exercise_id}`}</Text>
            <Text style={styles.meta}>
              {[item.sets != null ? `${item.sets} sets` : null, item.reps != null ? `${item.reps} reps` : null]
                .filter(Boolean)
                .join("  ·  ") || "See coach notes"}
            </Text>
            {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  actions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { flex: 1 },
  venuePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  venueText: { ...typography.caption, color: colors.primaryDark, textTransform: "capitalize" },
  notes: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  index: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  indexText: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  content: { flex: 1 },
  exName: { ...typography.subtitle, fontSize: 16 },
  meta: { ...typography.bodySmall, marginTop: 4 },
  itemNotes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
});
