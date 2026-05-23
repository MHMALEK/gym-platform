import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import {
  apiClientTrainingSessions,
  type ClientWorkoutSession,
} from "../../../lib/clientPortalApi";
import { useAppMessage } from "../../../lib/useAppMessage";

export function ClientTrainingHistoryPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [items, setItems] = useState<ClientWorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClientTrainingSessions()
      .then((data) => {
        if (!cancelled) setItems(data);
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
  }, [message]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Button component={RouterLink} to="/client/plans/workout" startIcon={<ArrowBackIcon />}>
          {t("clientPortal.backToWorkoutPlan")}
        </Button>
        <Button component={RouterLink} to="/client/training/log" variant="contained" sx={{ ml: { sm: "auto" } }}>
          {t("clientPortal.logWorkout")}
        </Button>
      </Stack>

      <Typography variant="h5">{t("clientPortal.trainingHistory")}</Typography>

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.trainingNoHistory")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((session) => (
            <Box
              key={session.id}
              component={RouterLink}
              to={`/client/training/${session.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                textDecoration: "none",
                color: "inherit",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box>
                <Typography fontWeight={600}>
                  {dayjs(session.started_at).format("MMM D, YYYY · h:mm A")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("clientPortal.trainingExerciseCount", {
                    done: session.completed_exercise_count,
                    total: session.exercise_count,
                  })}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={session.completed_at ? "success" : "warning"}
                label={session.completed_at ? t("clientPortal.trainingDone") : t("clientPortal.trainingInProgress")}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
