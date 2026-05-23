import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { WorkoutEntryLog } from "../../../lib/clientPortalApi";

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
    <Stack spacing={1} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: entry.completed ? "success.50" : "background.paper" }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Checkbox
          checked={entry.completed}
          onChange={(_, checked) =>
            onChange({
              ...entry,
              completed: checked,
              sets: entry.sets.map((s) => ({ ...s, completed: checked ? true : s.completed })),
            })
          }
        />
        <Box>
          <Typography fontWeight={600}>{entry.exercise_name}</Typography>
          <Typography variant="caption" color="text.secondary">
            Target: {prescribed}
          </Typography>
        </Box>
      </Stack>
      {entry.sets.map((set) => (
        <Stack key={set.set_number} direction="row" alignItems="center" spacing={1} pl={1}>
          <Checkbox
            size="small"
            checked={set.completed}
            onChange={(_, checked) => {
              const sets = entry.sets.map((s) => (s.set_number === set.set_number ? { ...s, completed: checked } : s));
              onChange({ ...entry, sets, completed: sets.every((s) => s.completed) });
            }}
          />
          <Typography variant="body2" sx={{ minWidth: 48 }}>
            Set {set.set_number}
          </Typography>
          <TextField
            size="small"
            label="Reps"
            type="number"
            value={set.reps ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              onChange({
                ...entry,
                sets: entry.sets.map((s) => (s.set_number === set.set_number ? { ...s, reps: v } : s)),
              });
            }}
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            label="kg"
            type="number"
            value={set.weight_kg ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              onChange({
                ...entry,
                sets: entry.sets.map((s) => (s.set_number === set.set_number ? { ...s, weight_kg: v } : s)),
              });
            }}
            sx={{ width: 100 }}
          />
        </Stack>
      ))}
    </Stack>
  );
}
