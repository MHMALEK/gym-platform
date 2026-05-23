import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, spacing, typography } from "@/constants/theme";
import { apiListTrainingSessions, type ClientWorkoutSession } from "@/lib/api";

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TrainingHistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ClientWorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await apiListTrainingSessions());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading training log…" />;

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={rows.length === 0 ? styles.empty : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" title="No workouts logged yet" message="Start a session from your workout plan." />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(tabs)/plans/${item.id}`)}>
            <View style={styles.rowLeft}>
              <Text style={styles.date}>{fmtWhen(item.started_at)}</Text>
              <Text style={styles.meta}>
                {item.completed_exercise_count}/{item.exercise_count} exercises
              </Text>
            </View>
            <Badge label={item.completed_at ? "Done" : "In progress"} tone={item.completed_at ? "success" : "warning"} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  empty: { flexGrow: 1, justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowLeft: { flex: 1, marginRight: spacing.sm },
  date: { ...typography.subtitle, fontSize: 15 },
  meta: { ...typography.caption, marginTop: 4 },
});
