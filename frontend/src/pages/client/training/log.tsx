import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { useClientMe } from "../../../contexts/ClientMeContext";
import {
  apiClientCreateTrainingSession,
  buildEntriesFromPlanItems,
  type WorkoutEntryLog,
} from "../../../lib/clientPortalApi";
import { useAppMessage } from "../../../lib/useAppMessage";
import { LogExerciseCard } from "./LogExerciseCard";

export function ClientTrainingLogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const message = useAppMessage();
  const { me } = useClientMe();
  const [entries, setEntries] = useState<WorkoutEntryLog[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const workoutItems = useMemo(
    () =>
      (me?.coaching_plan.workout_items ?? []) as Parameters<typeof buildEntriesFromPlanItems>[0],
    [me?.coaching_plan.workout_items],
  );

  useEffect(() => {
    setEntries(buildEntriesFromPlanItems(workoutItems));
    setReady(true);
  }, [workoutItems]);

  const done = entries.filter((e) => e.completed).length;

  const onSave = async () => {
    if (entries.length === 0) {
      message.error(t("clientPortal.trainingNothingToLog"));
      return;
    }
    setSaving(true);
    try {
      await apiClientCreateTrainingSession({ entries, notes: notes.trim() || null });
      message.success(t("clientPortal.trainingSaved"));
      navigate("/client/training/history", { replace: true });
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/client/plans/workout" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>
        {t("clientPortal.backToWorkoutPlan")}
      </Button>

      <Typography variant="h5">{t("clientPortal.logWorkout")}</Typography>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.trainingNothingToLog")}
        </Typography>
      ) : (
        <>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: "success.50" }}>
            <Typography textAlign="center" fontWeight={600}>
              {t("clientPortal.trainingProgress", { done, total: entries.length })}
            </Typography>
          </Box>

          {entries.map((entry, idx) => (
            <LogExerciseCard
              key={`${entry.exercise_id}-${idx}`}
              entry={entry}
              onChange={(next) => setEntries((prev) => prev.map((e, i) => (i === idx ? next : e)))}
            />
          ))}

          <TextField
            label={t("clientPortal.trainingSessionNotes")}
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />

          <Button variant="contained" size="large" disabled={saving} onClick={() => void onSave()}>
            {saving ? t("clientPortal.trainingSaving") : t("clientPortal.trainingFinish")}
          </Button>
        </>
      )}
    </Stack>
  );
}
