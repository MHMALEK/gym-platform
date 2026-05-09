import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { listTrainingPlans, type TrainingPlanSummary } from "@/lib/planner";

const PAGE = 50;

export default function PlannerListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<TrainingPlanSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { items, total: t } = await listTrainingPlans({ limit: PAGE, offset: 0 });
      setRows(items);
      setTotal(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (loading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {error ? <Text style={styles.err}>{error}</Text> : <Text style={styles.meta}>{total} plans</Text>}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(tabs)/planner/${item.id}`)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub}>Venue: {item.venue_type}</Text>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>No training plans yet.</Text> : null}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/(tabs)/planner/assign")}>
        <Text style={styles.fabText}>Assign to client</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  meta: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: "#6b7280" },
  err: { color: "#b91c1c", padding: 16 },
  row: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  name: { fontSize: 17, fontWeight: "600", color: "#111827" },
  sub: { marginTop: 4, fontSize: 13, color: "#2563eb", textTransform: "capitalize" },
  desc: { marginTop: 6, fontSize: 14, color: "#6b7280" },
  empty: { textAlign: "center", marginTop: 48, color: "#9ca3af" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
