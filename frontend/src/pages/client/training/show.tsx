import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

import { apiClientTrainingSession, type ClientWorkoutSession } from "../../../lib/clientPortalApi";
import { useAppMessage } from "../../../lib/useAppMessage";

export function ClientTrainingSessionPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [session, setSession] = useState<ClientWorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiClientTrainingSession(id)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) message.error(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, message]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!Number.isFinite(id) || !session) {
    return (
      <Stack spacing={2}>
        <Typography color="error">{t("clientPortal.trainingSessionNotFound")}</Typography>
        <Button component={RouterLink} to="/client/training/history" startIcon={<ArrowBackIcon />}>
          {t("clientPortal.trainingHistory")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/client/training/history" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>
        {t("clientPortal.trainingHistory")}
      </Button>

      <Typography variant="h5">{dayjs(session.started_at).format("MMM D, YYYY · h:mm A")}</Typography>
      {session.completed_at ? (
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.trainingFinishedAt", { date: dayjs(session.completed_at).format("MMM D, YYYY · h:mm A") })}
        </Typography>
      ) : null}

      {session.notes ? (
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: "primary.50" }}>
          <Typography variant="overline" color="text.secondary">
            {t("clientPortal.notes")}
          </Typography>
          <Typography variant="body2">{session.notes}</Typography>
        </Box>
      ) : null}

      {session.entries.map((entry, idx) => (
        <Box key={`${entry.exercise_id}-${idx}`} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Typography fontWeight={600} gutterBottom>
            {entry.exercise_name}
          </Typography>
          {entry.sets.map((set) => (
            <Typography key={set.set_number} variant="body2" color="text.secondary">
              {t("clientPortal.trainingSetLine", {
                n: set.set_number,
                done: set.completed ? "✓" : "—",
                reps: set.reps != null ? set.reps : "—",
                weight: set.weight_kg != null ? set.weight_kg : "—",
              })}
            </Typography>
          ))}
        </Box>
      ))}
    </Stack>
  );
}
