import type { ClientWorkoutItem } from "@/lib/api";

export type WorkoutSetLog = {
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  completed: boolean;
};

export type WorkoutEntryLog = {
  exercise_id: number | null;
  exercise_name: string;
  sort_order: number;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  sets: WorkoutSetLog[];
  completed: boolean;
  notes: string | null;
};

export type ClientWorkoutSession = {
  id: number;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  entries: WorkoutEntryLog[];
  exercise_count: number;
  completed_exercise_count: number;
  created_at: string;
};

export function buildEntriesFromPlanItems(items: ClientWorkoutItem[]): WorkoutEntryLog[] {
  return items.map((item, idx) => {
    const prescribed_sets = item.sets ?? null;
    const prescribed_reps = item.reps ?? null;
    const n = prescribed_sets && prescribed_sets > 0 ? prescribed_sets : 1;
    const sets: WorkoutSetLog[] = [];
    for (let s = 1; s <= n; s += 1) {
      sets.push({
        set_number: s,
        reps: prescribed_reps,
        weight_kg: item.weight_kg ?? null,
        completed: false,
      });
    }
    return {
      exercise_id: item.exercise_id,
      exercise_name: item.exercise_name ?? `Exercise #${item.exercise_id}`,
      sort_order: idx,
      prescribed_sets,
      prescribed_reps,
      sets,
      completed: false,
      notes: item.notes ?? null,
    };
  });
}

export function toggleEntryComplete(entry: WorkoutEntryLog, completed: boolean): WorkoutEntryLog {
  return {
    ...entry,
    completed,
    sets: entry.sets.map((s) => ({ ...s, completed: completed ? true : s.completed })),
  };
}

export function toggleSetComplete(entry: WorkoutEntryLog, setNumber: number, completed: boolean): WorkoutEntryLog {
  const sets = entry.sets.map((s) => (s.set_number === setNumber ? { ...s, completed } : s));
  const allDone = sets.length > 0 && sets.every((s) => s.completed);
  return { ...entry, sets, completed: allDone };
}

export function updateSetField(
  entry: WorkoutEntryLog,
  setNumber: number,
  field: "reps" | "weight_kg",
  value: string,
): WorkoutEntryLog {
  const parsed = value.trim() === "" ? null : Number(value);
  const num = parsed != null && !Number.isNaN(parsed) ? parsed : null;
  const sets = entry.sets.map((s) => (s.set_number === setNumber ? { ...s, [field]: num } : s));
  return { ...entry, sets };
}
