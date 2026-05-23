import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function WorkoutScreen() {
  const { me } = useAuth();
  const plan = me?.coaching_plan;
  const items = plan?.workout_items ?? [];

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const hasContent =
    Boolean(plan.workout_plan?.trim()) ||
    Boolean(plan.workout_rich_html?.trim()) ||
    items.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No workout assigned yet.</Text>
      </View>
    );
  }

  const notes = plan.workout_rich_html
    ? stripHtml(plan.workout_rich_html)
    : (plan.workout_plan ?? "");

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.venue}>Venue: {plan.program_venue}</Text>
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}
      {items.map((item, idx) => (
        <View key={`${item.exercise_id}-${idx}`} style={styles.row}>
          <Text style={styles.exName}>{item.exercise_name ?? `Exercise #${item.exercise_id}`}</Text>
          <Text style={styles.meta}>
            {[item.sets != null ? `${item.sets} sets` : null, item.reps != null ? `${item.reps} reps` : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </Text>
          {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 32 },
  venue: { fontSize: 13, color: "#6b7280", marginBottom: 12, textTransform: "capitalize" },
  notes: { fontSize: 15, lineHeight: 22, color: "#374151", marginBottom: 16 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  exName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  itemNotes: { fontSize: 13, color: "#4b5563", marginTop: 6 },
  muted: { color: "#9ca3af", fontSize: 15 },
});
