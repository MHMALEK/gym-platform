import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type BaseRecord, useList } from "@refinedev/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";
import { REFINE_LIST_FIRST_PAGE_200 } from "../../lib/refineListPagination";
import { clearClientNutritionAssignment, clearClientWorkoutAssignment } from "../../lib/coachingPlanApply";
import { useAppMessage } from "../../lib/useAppMessage";

type CoachingSnapshot = {
  updated_at: string | null;
  assigned_training_plan_id: number | null;
  assigned_nutrition_template_id: number | null;
};

type Props = {
  clientId: number;
  variant: "edit" | "view";
  /** Bump to refetch assignment state (e.g. after sibling saves). */
  refreshKey?: number;
  onMutated?: () => void;
};

export function ClientAssignedPlansSummary({ clientId, variant, refreshKey = 0, onMutated }: Props) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<CoachingSnapshot | null>(null);
  const [confirmClear, setConfirmClear] = useState<"workout" | "nutrition" | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as CoachingSnapshot;
      setSnapshot({
        updated_at: data.updated_at ?? null,
        assigned_training_plan_id: data.assigned_training_plan_id ?? null,
        assigned_nutrition_template_id: data.assigned_nutrition_template_id ?? null,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const { data: trainingPlanList } = useList({
    resource: "training-plans",
    pagination: REFINE_LIST_FIRST_PAGE_200,
  });
  const { data: nutritionList } = useList({
    resource: "nutrition-templates",
    pagination: REFINE_LIST_FIRST_PAGE_200,
  });

  const workoutName = useMemo(() => {
    const id = snapshot?.assigned_training_plan_id;
    if (id == null) return null;
    const raw = (trainingPlanList?.data ?? []) as BaseRecord[];
    const row = raw.find((r) => Number(r.id) === id);
    return row ? String(row.name ?? "") : t("clients.plans.assignedUnknownPlan");
  }, [snapshot?.assigned_training_plan_id, trainingPlanList?.data, t]);

  const nutritionName = useMemo(() => {
    const id = snapshot?.assigned_nutrition_template_id;
    if (id == null) return null;
    const raw = (nutritionList?.data ?? []) as BaseRecord[];
    const row = raw.find((r) => Number(r.id) === id);
    return row ? String(row.name ?? "") : t("clients.plans.assignedUnknownTemplate");
  }, [snapshot?.assigned_nutrition_template_id, nutritionList?.data, t]);

  const runClear = async () => {
    if (!confirmClear) return;
    setClearing(true);
    try {
      const r =
        confirmClear === "workout"
          ? await clearClientWorkoutAssignment(clientId, apiPrefix, authHeaders)
          : await clearClientNutritionAssignment(clientId, apiPrefix, authHeaders);
      if (!r.ok) {
        message.error("message" in r ? r.message : t("clients.plans.applySelectionError"));
        return;
      }
      message.success(
        confirmClear === "workout"
          ? t("clients.plans.clearedWorkoutAssignment")
          : t("clients.plans.clearedNutritionAssignment"),
      );
      setConfirmClear(null);
      await load();
      onMutated?.();
    } finally {
      setClearing(false);
    }
  };

  if (loading && snapshot == null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const hasWorkout = snapshot?.assigned_training_plan_id != null;
  const hasNutrition = snapshot?.assigned_nutrition_template_id != null;
  const showEmpty = !hasWorkout && !hasNutrition;

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "action.hover" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t("clients.plans.assignedProgramsHeading")}
        </Typography>
        {snapshot?.updated_at ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            {t("clients.plans.lastUpdated")}: {new Date(snapshot.updated_at).toLocaleString()}
          </Typography>
        ) : null}

        {showEmpty ? (
          <Typography variant="body2" color="text.secondary">
            {t("clients.plans.noneAssigned")}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} flexWrap="wrap">
              <Typography variant="body2" component="span" sx={{ minWidth: 0 }}>
                <strong>{t("clients.plans.assignedWorkoutLabel")}:</strong>{" "}
                {hasWorkout ? workoutName : t("clients.plans.noneDash")}
              </Typography>
              {hasWorkout ? (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setConfirmClear("workout")}
                >
                  {t("clients.plans.removeWorkoutAssignment")}
                </Button>
              ) : null}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} flexWrap="wrap">
              <Typography variant="body2" component="span" sx={{ minWidth: 0 }}>
                <strong>{t("clients.plans.assignedNutritionLabel")}:</strong>{" "}
                {hasNutrition ? nutritionName : t("clients.plans.noneDash")}
              </Typography>
              {hasNutrition ? (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setConfirmClear("nutrition")}
                >
                  {t("clients.plans.removeNutritionAssignment")}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        )}

        {variant === "view" ? (
          <Button
            component={Link}
            to={`/clients/edit/${clientId}#workout`}
            size="small"
            variant="contained"
            sx={{ mt: 2 }}
            startIcon={<EditOutlinedIcon />}
          >
            {t("clients.plans.changeAssignmentEditPage")}
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
            {t("clients.plans.changeAssignmentEditHint")}
          </Typography>
        )}
      </Paper>

      <Dialog open={confirmClear != null} onClose={() => !clearing && setConfirmClear(null)}>
        <DialogTitle>
          {confirmClear === "workout"
            ? t("clients.plans.removeWorkoutAssignmentTitle")
            : t("clients.plans.removeNutritionAssignmentTitle")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmClear === "workout"
              ? t("clients.plans.removeWorkoutAssignmentBody")
              : t("clients.plans.removeNutritionAssignmentBody")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(null)} disabled={clearing}>
            {t("actions.cancel")}
          </Button>
          <Button color="error" variant="contained" onClick={() => void runClear()} disabled={clearing}>
            {clearing ? <CircularProgress size={20} color="inherit" /> : t("clients.plans.confirmRemove")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
