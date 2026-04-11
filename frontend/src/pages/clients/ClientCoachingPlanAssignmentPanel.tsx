import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type BaseRecord, useList } from "@refinedev/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";
import { REFINE_LIST_FIRST_PAGE_200 } from "../../lib/refineListPagination";
import {
  assignNutritionTemplateToClients,
  assignTrainingPlanToClients,
} from "../../lib/coachingPlanApply";
import { useAppMessage } from "../../lib/useAppMessage";
import { ClientAssignedPlansSummary } from "./ClientAssignedPlansSummary";
import { clientWorkoutDietPath } from "./ClientPlansCta";

const TABLE_PAGE = 8;

type Props = {
  clientId: number;
  /** Called after assign/remove so sibling editors (e.g. full program on show) can reload. */
  onProgramsUpdated?: () => void;
  /** Passed to assigned-program summary (view = link to edit client; edit = hint text). */
  summaryVariant?: "edit" | "view";
  /** Omit nutrition template pickers and summary row (client edit — use view / full program page for diet). */
  hideNutritionSection?: boolean;
};

export function ClientCoachingPlanAssignmentPanel({
  clientId,
  onProgramsUpdated,
  summaryVariant = "edit",
  hideNutritionSection = false,
}: Props) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [summaryTick, setSummaryTick] = useState(0);
  const [assignedWorkoutId, setAssignedWorkoutId] = useState<number | null>(null);
  const [assignedNutritionId, setAssignedNutritionId] = useState<number | null>(null);
  const [trainingPlanFilter, setTrainingPlanFilter] = useState("");
  const [nutritionTemplateFilter, setNutritionTemplateFilter] = useState("");
  const [tpPage, setTpPage] = useState(0);
  const [ntPage, setNtPage] = useState(0);
  const [assigningWorkoutId, setAssigningWorkoutId] = useState<number | null>(null);
  const [assigningNutritionId, setAssigningNutritionId] = useState<number | null>(null);

  const loadAssignedIds = useCallback(async () => {
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        assigned_training_plan_id?: number | null;
        assigned_nutrition_template_id?: number | null;
      };
      setAssignedWorkoutId(data.assigned_training_plan_id ?? null);
      setAssignedNutritionId(data.assigned_nutrition_template_id ?? null);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  useEffect(() => {
    void loadAssignedIds();
  }, [loadAssignedIds, summaryTick]);

  const { data: trainingPlanList, isLoading: trainingPlansLoading } = useList({
    resource: "training-plans",
    pagination: REFINE_LIST_FIRST_PAGE_200,
  });
  const trainingPlanRows = useMemo(() => {
    const raw = (trainingPlanList?.data ?? []) as BaseRecord[];
    const q = trainingPlanFilter.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => String(r.name ?? "").toLowerCase().includes(q));
  }, [trainingPlanList?.data, trainingPlanFilter]);
  const trainingPlansTotalCount = trainingPlanList?.data?.length ?? 0;

  const { data: nutritionTemplateList, isLoading: nutritionTemplatesLoading } = useList({
    resource: "nutrition-templates",
    pagination: REFINE_LIST_FIRST_PAGE_200,
    queryOptions: { enabled: !hideNutritionSection },
  });
  const nutritionTemplateRows = useMemo(() => {
    const raw = (nutritionTemplateList?.data ?? []) as BaseRecord[];
    const q = nutritionTemplateFilter.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => String(r.name ?? "").toLowerCase().includes(q));
  }, [nutritionTemplateList?.data, nutritionTemplateFilter]);
  const nutritionTemplatesTotalCount = nutritionTemplateList?.data?.length ?? 0;

  const onAssignWorkout = async (planId: number) => {
    setAssigningWorkoutId(planId);
    try {
      const r = await assignTrainingPlanToClients(planId, [clientId], apiPrefix, authHeaders);
      if (!r.ok) {
        message.error("message" in r ? r.message : t("clients.plans.applySelectionError"));
        return;
      }
      message.success(t("clients.plans.editWorkoutAssigned"));
      setSummaryTick((k) => k + 1);
      onProgramsUpdated?.();
    } finally {
      setAssigningWorkoutId(null);
    }
  };

  const onAssignNutrition = async (templateId: number) => {
    setAssigningNutritionId(templateId);
    try {
      const r = await assignNutritionTemplateToClients(templateId, [clientId], apiPrefix, authHeaders);
      if (!r.ok) {
        message.error("message" in r ? r.message : t("clients.plans.applySelectionError"));
        return;
      }
      message.success(t("clients.plans.editNutritionAssigned"));
      setSummaryTick((k) => k + 1);
      onProgramsUpdated?.();
    } finally {
      setAssigningNutritionId(null);
    }
  };

  const workoutEmptyMsg =
    trainingPlansTotalCount === 0
      ? t("clients.plans.workoutTemplateEmptyList")
      : trainingPlanFilter.trim()
        ? t("clients.plans.workoutTemplateFilterEmpty")
        : t("clients.plans.workoutTemplateEmptyList");

  const nutritionEmptyMsg =
    nutritionTemplatesTotalCount === 0
      ? t("clients.plans.templateEmptyList")
      : nutritionTemplateFilter.trim()
        ? t("clients.plans.templateFilterEmpty")
        : t("clients.plans.templateEmptyList");

  const fullEditorPath = clientWorkoutDietPath(clientId);

  return (
    <div className="client-coaching-assign-panel" style={{ paddingTop: 4, maxWidth: 960 }}>
      <Card className="client-section-card client-section-card--editable">
        <CardContent sx={{ pt: 2 }}>
          <Typography variant="h6" sx={{ mt: 0 }}>
            {t("clients.plans.editPickersTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("clients.plans.editPickersHint")}
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("clients.plans.editPickersFullEditorLead")}
            </Typography>
            <Button
              component={Link}
              to={fullEditorPath}
              variant="contained"
              size="medium"
              endIcon={<OpenInNewIcon fontSize="small" />}
            >
              {t("clients.plans.openFullEditorLink")}
            </Button>
          </Alert>

          <ClientAssignedPlansSummary
            clientId={clientId}
            variant={summaryVariant}
            hideNutrition={hideNutritionSection}
            refreshKey={summaryTick}
            onMutated={() => {
              setSummaryTick((k) => k + 1);
              onProgramsUpdated?.();
            }}
          />

          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
            {t("clients.plans.workoutTemplatesSectionTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("clients.plans.editPickersWorkoutSub")}
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Button component={Link} to="/training-plans/create" variant="outlined" size="small">
              {t("clients.plans.newWorkoutPlan")}
            </Button>
          </Box>
          <Stack spacing={2} sx={{ mb: 3, width: "100%" }}>
            <TextField
              size="small"
              placeholder={t("clients.plans.filterWorkoutPlansPlaceholder")}
              value={trainingPlanFilter}
              onChange={(e) => {
                setTrainingPlanFilter(e.target.value);
                setTpPage(0);
              }}
              sx={{ maxWidth: 400 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("trainingPlans.list.name")}</TableCell>
                    <TableCell>{t("trainingPlans.list.description")}</TableCell>
                    <TableCell width={140}>{t("trainingPlans.list.venue")}</TableCell>
                    <TableCell width={220}>{t("nutritionTemplates.list.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingPlanRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          {workoutEmptyMsg}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    trainingPlanRows.slice(tpPage * TABLE_PAGE, tpPage * TABLE_PAGE + TABLE_PAGE).map((r) => {
                      const id = Number(r.id);
                      const busy = assigningWorkoutId === id;
                      const isAssigned = assignedWorkoutId != null && id === assignedWorkoutId;
                      return (
                        <TableRow
                          key={String(r.id)}
                          sx={isAssigned ? { bgcolor: (theme) => `${theme.palette.primary.main}14` } : undefined}
                        >
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                              <span>{String(r.name ?? "")}</span>
                              {isAssigned ? (
                                <Chip size="small" label={t("clients.plans.rowAssignedBadge")} color="primary" variant="outlined" />
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>{String(r.description ?? "")}</TableCell>
                          <TableCell>{t(`workouts.venue.${(r as Record<string, unknown>).venue_type ?? "mixed"}`)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={busy}
                                onClick={() => void onAssignWorkout(id)}
                              >
                                {busy ? <CircularProgress size={18} color="inherit" /> : t("clients.plans.assignWorkoutToClient")}
                              </Button>
                              <Button component={Link} to={`/training-plans/edit/${r.id}`} size="small" variant="outlined">
                                {t("actions.edit")}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {trainingPlanRows.length > TABLE_PAGE ? (
              <TablePagination
                component="div"
                count={trainingPlanRows.length}
                page={tpPage}
                onPageChange={(_, p) => setTpPage(p)}
                rowsPerPage={TABLE_PAGE}
                rowsPerPageOptions={[TABLE_PAGE]}
              />
            ) : null}
            {trainingPlansLoading ? <CircularProgress size={24} /> : null}
          </Stack>

          {!hideNutritionSection ? (
            <>
              <Typography variant="subtitle1" fontWeight={600}>
                {t("clients.plans.templatesSectionTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("clients.plans.editPickersNutritionSub")}
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <Button component={Link} to="/nutrition-templates/create" variant="outlined" size="small">
                  {t("clients.plans.newTemplate")}
                </Button>
              </Box>
              <Stack spacing={2} sx={{ mb: 1, width: "100%" }}>
                <TextField
                  size="small"
                  placeholder={t("clients.plans.filterTemplatesPlaceholder")}
                  value={nutritionTemplateFilter}
                  onChange={(e) => {
                    setNutritionTemplateFilter(e.target.value);
                    setNtPage(0);
                  }}
                  sx={{ maxWidth: 400 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("nutritionTemplates.list.name")}</TableCell>
                        <TableCell width={88}>{t("nutritionTemplates.list.meals")}</TableCell>
                        <TableCell width={220}>{t("nutritionTemplates.list.actions")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {nutritionTemplateRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="body2" color="text.secondary">
                              {nutritionEmptyMsg}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        nutritionTemplateRows.slice(ntPage * TABLE_PAGE, ntPage * TABLE_PAGE + TABLE_PAGE).map((r) => {
                          const id = Number(r.id);
                          const busy = assigningNutritionId === id;
                          const isAssigned = assignedNutritionId != null && id === assignedNutritionId;
                          return (
                            <TableRow
                              key={String(r.id)}
                              sx={isAssigned ? { bgcolor: (theme) => `${theme.palette.primary.main}14` } : undefined}
                            >
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                  <span>{String(r.name ?? "")}</span>
                                  {isAssigned ? (
                                    <Chip size="small" label={t("clients.plans.rowAssignedBadge")} color="primary" variant="outlined" />
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>{Number((r as Record<string, unknown>).meal_count ?? 0)}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={busy}
                                    onClick={() => void onAssignNutrition(id)}
                                  >
                                    {busy ? <CircularProgress size={18} color="inherit" /> : t("clients.plans.assignNutritionToClient")}
                                  </Button>
                                  <Button component={Link} to={`/nutrition-templates/edit/${r.id}`} size="small" variant="outlined">
                                    {t("actions.edit")}
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {nutritionTemplateRows.length > TABLE_PAGE ? (
                  <TablePagination
                    component="div"
                    count={nutritionTemplateRows.length}
                    page={ntPage}
                    onPageChange={(_, p) => setNtPage(p)}
                    rowsPerPage={TABLE_PAGE}
                    rowsPerPageOptions={[TABLE_PAGE]}
                  />
                ) : null}
                {nutritionTemplatesLoading ? <CircularProgress size={24} /> : null}
              </Stack>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
