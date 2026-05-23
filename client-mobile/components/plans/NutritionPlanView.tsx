import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { ClientCoachingPlan } from "@/lib/api";

type Props = {
  plan: ClientCoachingPlan | undefined;
};

export function NutritionPlanView({ plan }: Props) {
  if (!plan) {
    return <EmptyState icon="restaurant-outline" title="Loading plan…" />;
  }

  const meals = plan.diet_meals ?? [];
  const hasContent = Boolean(plan.diet_plan?.trim()) || meals.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon="restaurant-outline"
        title="No nutrition plan yet"
        message="Meals and macros from your coach will show up here."
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {plan.diet_plan ? <Text style={styles.notes}>{plan.diet_plan}</Text> : null}
      {meals.map((meal, idx) => (
        <View key={idx} style={styles.row}>
          <View style={styles.mealHeader}>
            <View style={styles.mealBadge}>
              <Text style={styles.mealBadgeText}>{idx + 1}</Text>
            </View>
            <Text style={styles.mealName}>{meal.name ?? `Meal ${idx + 1}`}</Text>
          </View>
          {meal.notes ? <Text style={styles.meta}>{meal.notes}</Text> : null}
          {(meal.items ?? []).map((it, j) => (
            <View key={j} style={styles.itemRow}>
              <View style={styles.dot} />
              <Text style={styles.item}>
                {it.name ?? "Item"}
                {it.amount ? `  ·  ${it.amount}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  notes: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  mealBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.warningBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  mealBadgeText: { fontSize: 13, fontWeight: "700", color: colors.warning },
  mealName: { ...typography.subtitle, fontSize: 16, flex: 1 },
  meta: { ...typography.bodySmall, marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  item: { ...typography.bodySmall, flex: 1, color: colors.text },
});
