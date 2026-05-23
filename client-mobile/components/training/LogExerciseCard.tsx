import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing, typography } from "@/constants/theme";
import type { WorkoutEntryLog } from "@/lib/trainingLog";
import { toggleEntryComplete, toggleSetComplete, updateSetField } from "@/lib/trainingLog";

type Props = {
  entry: WorkoutEntryLog;
  onChange: (next: WorkoutEntryLog) => void;
};

export function LogExerciseCard({ entry, onChange }: Props) {
  const prescribed =
    [entry.prescribed_sets != null ? `${entry.prescribed_sets} sets` : null, entry.prescribed_reps != null ? `${entry.prescribed_reps} reps` : null]
      .filter(Boolean)
      .join(" × ") || "As prescribed";

  return (
    <View style={[styles.card, entry.completed && styles.cardDone]}>
      <Pressable
        style={styles.header}
        onPress={() => onChange(toggleEntryComplete(entry, !entry.completed))}
      >
        <View style={[styles.check, entry.completed && styles.checkOn]}>
          {entry.completed ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{entry.exercise_name}</Text>
          <Text style={styles.prescribed}>Target: {prescribed}</Text>
        </View>
      </Pressable>

      {entry.sets.map((set) => (
        <View key={set.set_number} style={styles.setRow}>
          <Pressable
            style={[styles.setCheck, set.completed && styles.setCheckOn]}
            onPress={() => onChange(toggleSetComplete(entry, set.set_number, !set.completed))}
          >
            {set.completed ? <Ionicons name="checkmark" size={14} color="#fff" /> : (
              <Text style={styles.setNum}>{set.set_number}</Text>
            )}
          </Pressable>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Reps"
            placeholderTextColor={colors.textMuted}
            value={set.reps != null ? String(set.reps) : ""}
            onChangeText={(v) => onChange(updateSetField(entry, set.set_number, "reps", v))}
          />
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={colors.textMuted}
            value={set.weight_kg != null ? String(set.weight_kg) : ""}
            onChangeText={(v) => onChange(updateSetField(entry, set.set_number, "weight_kg", v))}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardDone: { borderColor: colors.primaryMuted, backgroundColor: colors.primaryLight },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  check: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  headerText: { flex: 1 },
  name: { ...typography.subtitle, fontSize: 16 },
  prescribed: { ...typography.caption, marginTop: 2 },
  setRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  setCheck: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  setCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  setNum: { ...typography.caption, color: colors.textSecondary },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
