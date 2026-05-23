import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export default function NutritionScreen() {
  const { me } = useAuth();
  const plan = me?.coaching_plan;
  const meals = plan?.diet_meals ?? [];

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const hasContent = Boolean(plan.diet_plan?.trim()) || meals.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No nutrition plan assigned yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {plan.diet_plan ? <Text style={styles.notes}>{plan.diet_plan}</Text> : null}
      {meals.map((meal, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.mealName}>{meal.name ?? `Meal ${idx + 1}`}</Text>
          {meal.notes ? <Text style={styles.meta}>{meal.notes}</Text> : null}
          {(meal.items ?? []).map((it, j) => (
            <Text key={j} style={styles.item}>
              · {it.name ?? "Item"}
              {it.amount ? ` — ${it.amount}` : ""}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 32 },
  notes: { fontSize: 15, lineHeight: 22, color: "#374151", marginBottom: 16 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  mealName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  item: { fontSize: 14, color: "#374151", marginTop: 6 },
  muted: { color: "#9ca3af", fontSize: 15 },
});
