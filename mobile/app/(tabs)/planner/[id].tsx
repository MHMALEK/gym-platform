import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/lib/api";
import { getTrainingPlan, type TrainingPlanRead } from "@/lib/planner";

function rowSubtitle(item: TrainingPlanRead["items"][number]): string {
  const pieces = [];
  if (item.sets != null) pieces.push(`${item.sets} sets`);
  if (item.reps != null) pieces.push(`${item.reps} reps`);
  if (item.duration_sec != null) pieces.push(`${item.duration_sec}s`);
  if (item.rest_sec != null) pieces.push(`rest ${item.rest_sec}s`);
  return pieces.join(" · ") || "—";
}

export default function PlannerDetailScreen() {
  const router = useRouter();
  const { id: idParam, client_id: clientIdParam } = useLocalSearchParams<{ id: string; client_id?: string }>();
  const id = Number(idParam);
  const clientId = clientIdParam ? Number(clientIdParam) : null;
  const [plan, setPlan] = useState<TrainingPlanRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setError(null);
    try {
      setPlan(await getTrainingPlan(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !plan) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.err}>{error}</Text> : <ActivityIndicator size="large" />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>{plan.name}</Text>
      <Text style={styles.meta}>Venue: {plan.venue_type}</Text>
      {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}

      <Pressable
        style={styles.assignBtn}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/planner/assign",
            params: {
              training_plan_id: String(plan.id),
              ...(clientId ? { client_id: String(clientId) } : {}),
            },
          })
        }
      >
        <Text style={styles.assignBtnText}>Assign this plan</Text>
      </Pressable>

      <Text style={styles.section}>Items ({plan.items.length})</Text>
      {plan.items.length === 0 ? (
        <Text style={styles.muted}>No items in this plan yet.</Text>
      ) : (
        plan.items
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item, index) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.rowTitle}>
                {index + 1}. {item.exercise?.name || `Exercise #${item.exercise_id}`}
              </Text>
              <Text style={styles.rowSub}>{rowSubtitle(item)}</Text>
              {item.notes ? <Text style={styles.rowNotes}>{item.notes}</Text> : null}
            </View>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  err: { color: "#b91c1c", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 40, backgroundColor: "#f9fafb" },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 8, fontSize: 14, color: "#2563eb", textTransform: "capitalize" },
  desc: { marginTop: 12, fontSize: 15, color: "#374151", lineHeight: 22 },
  assignBtn: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  assignBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  section: { marginTop: 24, marginBottom: 12, fontSize: 18, fontWeight: "700", color: "#111827" },
  muted: { color: "#9ca3af" },
  row: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowSub: { marginTop: 4, fontSize: 13, color: "#6b7280" },
  rowNotes: { marginTop: 6, fontSize: 13, color: "#374151" },
});
