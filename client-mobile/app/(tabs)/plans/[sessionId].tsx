import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { apiGetTrainingSession, type ClientWorkoutSession } from "@/lib/api";

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function TrainingSessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const [session, setSession] = useState<ClientWorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetTrainingSession(id);
        if (!cancelled) setSession(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <LoadingState label="Loading session…" />;
  if (!session) {
    return (
      <Screen>
        <Text style={styles.muted}>Session not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.meta}>Started {fmtWhen(session.started_at)}</Text>
      {session.completed_at ? <Text style={styles.meta}>Finished {fmtWhen(session.completed_at)}</Text> : null}
      {session.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notes}>{session.notes}</Text>
        </View>
      ) : null}

      {session.entries.map((entry, idx) => (
        <View key={`${entry.exercise_id}-${idx}`} style={styles.card}>
          <Text style={styles.exName}>{entry.exercise_name}</Text>
          {entry.sets.map((set) => (
            <Text key={set.set_number} style={styles.setLine}>
              Set {set.set_number}: {set.completed ? "✓" : "—"}{" "}
              {set.reps != null ? `${set.reps} reps` : ""}
              {set.weight_kg != null ? ` @ ${set.weight_kg} kg` : ""}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { ...typography.bodySmall, marginBottom: spacing.xs },
  notesBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  notesLabel: { ...typography.label, marginBottom: spacing.xs },
  notes: { ...typography.body, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  exName: { ...typography.subtitle, fontSize: 16, marginBottom: spacing.sm },
  setLine: { ...typography.bodySmall, marginTop: 4 },
  muted: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
