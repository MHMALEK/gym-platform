import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { LogExerciseCard } from "@/components/training/LogExerciseCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateTrainingSession } from "@/lib/api";
import { buildEntriesFromPlanItems, type WorkoutEntryLog } from "@/lib/trainingLog";

export default function LogWorkoutScreen() {
  const router = useRouter();
  const { me } = useAuth();
  const [entries, setEntries] = useState<WorkoutEntryLog[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const items = me?.coaching_plan?.workout_items ?? [];
    setEntries(buildEntriesFromPlanItems(items));
    setReady(true);
  }, [me?.coaching_plan?.workout_items]);

  const onSave = async () => {
    if (entries.length === 0) {
      Alert.alert("Nothing to log", "Your coach has not assigned exercises yet.");
      return;
    }
    setSaving(true);
    try {
      await apiCreateTrainingSession({
        entries,
        notes: notes.trim() || null,
        complete: true,
      });
      router.replace("/(tabs)/plans/history");
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <LoadingState label="Preparing workout…" />;

  if (entries.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="barbell-outline"
          title="No exercises to log"
          message="Ask your coach to assign a workout plan first."
        />
        <Button label="Back to plan" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const done = entries.filter((e) => e.completed).length;

  return (
    <Screen safe={false} contentContainerStyle={styles.scroll}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          {done}/{entries.length} exercises completed
        </Text>
      </View>

      {entries.map((entry, idx) => (
        <LogExerciseCard
          key={`${entry.exercise_id}-${idx}`}
          entry={entry}
          onChange={(next) => setEntries((prev) => prev.map((e, i) => (i === idx ? next : e)))}
        />
      ))}

      <Text style={styles.notesLabel}>Session notes (optional)</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        placeholder="How did it feel?"
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
      />

      <Button label="Finish workout" onPress={() => void onSave()} loading={saving} style={styles.saveBtn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  progress: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressText: { ...typography.subtitle, color: colors.primaryDark, textAlign: "center" },
  notesLabel: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.sm },
  notesInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 88,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: "top",
  },
  saveBtn: { marginTop: spacing.lg },
});
