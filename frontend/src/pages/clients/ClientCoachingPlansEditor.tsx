import SaveIcon from "@mui/icons-material/Save";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
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
import SearchIcon from "@mui/icons-material/Search";
import { type BaseRecord, useList } from "@refinedev/core";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { CoachingPlanPreview } from "../../components/CoachingPlanPreview";
import { WorkoutRichEditor } from "../../components/WorkoutRichEditor";
import {
  normalizeWorkoutItemsForApi,
  type WorkoutLine,
  workoutLinesFromApiItems,
  WorkoutItemsEditor,
} from "../../components/WorkoutItemsEditor";
import { apiPrefix, authHeaders } from "../../lib/api";
import { REFINE_LIST_FIRST_PAGE_200 } from "../../lib/refineListPagination";
import { useAppMessage } from "../../lib/useAppMessage";
import { dietMealsFromApi, normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";
import { clientPlanViewerPath } from "./ClientPlansCta";

export type CoachingPayload = {
  workout_plan: string | null;
  workout_rich_html: string | null;
  program_venue?: string | null;
  diet_plan: string | null;
  diet_meals?: unknown[];
  workout_items?: Array<{
    exercise_id: number;
    sort_order: number;
    sets: number | null;
    reps: number | null;
    duration_sec: number | null;
    rest_sec: number | null;
    weight_kg?: number | null;
    rpe?: number | null;
    tempo?: string | null;
    notes: string | null;
    block_id?: string | null;
    block_type?: string | null;
    row_type?: string | null;
    exercise_instance_id?: string | null;
    exercise_name?: string | null;
    exercise?: WorkoutLine["exercise"];
  }>;
  updated_at: string | null;
  assigned_training_plan_id?: number | null;
  assigned_nutrition_template_id?: number | null;
};

type FormValues = {
  program_venue: string;
  workout_plan: string;
  workout_rich_html: string;
  diet_plan: string;
};

type Props = {
  clientId: number;
  embed?: boolean;
  extraActions?: ReactNode;
  /** Bump to reload coaching data from the server (e.g. after assignment cleared elsewhere). */
  reloadToken?: number;
  onCoachingPlansMutated?: () => void;
};

type PreviewSnapshot = {
  values: FormValues;
  lines: WorkoutLine[];
  dietMeals: DietMeal[];
};

const TABLE_PAGE = 8;

export function ClientCoachingPlansEditor({
  clientId,
  embed,
  extraActions,
  reloadToken = 0,
  onCoachingPlansMutated,
}: Props) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [lines, setLines] = useState<WorkoutLine[]>([]);
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const [nutritionTemplateFilter, setNutritionTemplateFilter] = useState("");
  const [trainingPlanFilter, setTrainingPlanFilter] = useState("");
  const [tpPage, setTpPage] = useState(0);
  const [ntPage, setNtPage] = useState(0);
  const [assignedTrainingPlanId, setAssignedTrainingPlanId] = useState<number | null>(null);
  const [assignedNutritionTemplateId, setAssignedNutritionTemplateId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewSnapshot | null>(null);

  const { control, handleSubmit, reset, getValues } = useForm<FormValues>({
    defaultValues: {
      program_venue: "mixed",
      workout_plan: "",
      workout_rich_html: "",
      diet_plan: "",
    },
  });

  const programVenue = useWatch({ control, name: "program_venue" });
  const planVenueForPicker =
    programVenue === "home" || programVenue === "commercial_gym" ? programVenue : null;

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
  });
  const nutritionTemplateRows = useMemo(() => {
    const raw = (nutritionTemplateList?.data ?? []) as BaseRecord[];
    const q = nutritionTemplateFilter.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => String(r.name ?? "").toLowerCase().includes(q));
  }, [nutritionTemplateList?.data, nutritionTemplateFilter]);
  const nutritionTemplatesTotalCount = nutritionTemplateList?.data?.length ?? 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      const data = (await res.json()) as CoachingPayload;
      const pv = data.program_venue;
      reset({
        program_venue: pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed",
        workout_plan: data.workout_plan ?? "",
        workout_rich_html: data.workout_rich_html ?? "",
        diet_plan: data.diet_plan ?? "",
      });
      setLines(workoutLinesFromApiItems(data.workout_items ?? []));
      setDietMeals(dietMealsFromApi(data.diet_meals ?? []));
      setUpdatedAt(data.updated_at);
      setAssignedTrainingPlanId(data.assigned_training_plan_id ?? null);
      setAssignedNutritionTemplateId(data.assigned_nutrition_template_id ?? null);
    } catch {
      message.error(t("clients.plans.loadError"));
    } finally {
      setLoading(false);
    }
  }, [clientId, message, reset, t]);

  const applyNutritionTemplate = useCallback(
    async (templateId: number) => {
      try {
        const res = await fetch(`${apiPrefix}/nutrition-templates/${templateId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          message.error(t("clients.plans.templateApplyError"));
          return;
        }
        const json = (await res.json()) as { meals?: unknown[] };
        setDietMeals(dietMealsFromApi(json.meals ?? []));
        setAssignedNutritionTemplateId(templateId);
        message.success(t("clients.plans.templateApplied"));
      } catch {
        message.error(t("clients.plans.templateApplyError"));
      }
    },
    [message, t],
  );

  const applyTrainingPlan = useCallback(
    async (planId: number) => {
      try {
        const res = await fetch(`${apiPrefix}/training-plans/${planId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          message.error(t("clients.plans.workoutTemplateApplyError"));
          return;
        }
        const data = (await res.json()) as {
          items?: Parameters<typeof workoutLinesFromApiItems>[0];
          workout_rich_html?: string | null;
          venue_type?: string;
        };
        setLines(workoutLinesFromApiItems(data.items ?? []));
        const pv = data.venue_type;
        const programVenueOut =
          pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed";
        reset({
          ...getValues(),
          workout_rich_html: data.workout_rich_html ?? "",
          program_venue: programVenueOut,
        });
        setAssignedTrainingPlanId(planId);
        message.success(t("clients.plans.workoutTemplateApplied"));
      } catch {
        message.error(t("clients.plans.workoutTemplateApplyError"));
      }
    },
    [getValues, message, reset, t],
  );

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const htmlRaw = (values.workout_rich_html ?? "").trim();
      const workoutRich =
        htmlRaw && htmlRaw !== "<p><br></p>" && htmlRaw !== "<p></p>" ? htmlRaw : null;
      const pv = values.program_venue;
      const programVenueOut =
        pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed";
      const body = {
        program_venue: programVenueOut,
        workout_plan: values.workout_plan?.trim() ? values.workout_plan.trim() : null,
        workout_rich_html: workoutRich,
        diet_plan: values.diet_plan?.trim() ? values.diet_plan.trim() : null,
        diet_meals: normalizeDietMealsForApi(dietMeals),
        workout_items: normalizeWorkoutItemsForApi(lines),
        assigned_training_plan_id: assignedTrainingPlanId,
        assigned_nutrition_template_id: assignedNutritionTemplateId,
      };
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      const data = (await res.json()) as CoachingPayload;
      setUpdatedAt(data.updated_at);
      setLines(workoutLinesFromApiItems(data.workout_items ?? []));
      setDietMeals(dietMealsFromApi(data.diet_meals ?? []));
      setAssignedTrainingPlanId(data.assigned_training_plan_id ?? null);
      setAssignedNutritionTemplateId(data.assigned_nutrition_template_id ?? null);
      message.success(t("clients.plans.saved"));
      onCoachingPlansMutated?.();
    } catch {
      message.error(t("clients.plans.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const saveButtons = (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      <Button type="submit" variant="contained" disabled={saving} startIcon={<SaveIcon />}>
        {t("clients.plans.save")}
      </Button>
      <Button
        type="button"
        variant="outlined"
        onClick={() =>
          setPreview({
            values: getValues(),
            lines,
            dietMeals,
          })
        }
      >
        Preview full plan
      </Button>
      <Button component={Link} to={clientPlanViewerPath(clientId)} type="button" variant="contained">
        Open full viewer
      </Button>
      {extraActions}
    </Stack>
  );

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

  const inner = (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ position: "relative" }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : null}
      {!loading && updatedAt ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          {t("clients.plans.lastUpdated")}: {new Date(updatedAt).toLocaleString()}
        </Typography>
      ) : null}

      {!loading ? (
        <>
          {saveButtons}
          <Divider sx={{ my: 2 }} />

          <Controller
            name="program_venue"
            control={control}
            render={({ field }) => (
              <TextField {...field} select fullWidth margin="normal" label={t("clients.plans.programVenue")}>
                <MenuItem value="mixed">{t("workouts.venue.mixed")}</MenuItem>
                <MenuItem value="home">{t("workouts.venue.home")}</MenuItem>
                <MenuItem value="commercial_gym">{t("workouts.venue.commercial_gym")}</MenuItem>
              </TextField>
            )}
          />

          <Typography variant="h6" sx={{ mt: 1 }}>
            {t("clients.plans.workoutSectionTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("clients.plans.workoutSectionHint")}
          </Typography>

          <Controller
            name="workout_rich_html"
            control={control}
            render={({ field }) => (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t("clients.plans.workoutRichLabel")}
                </Typography>
                <WorkoutRichEditor
                  placeholder={t("clients.plans.workoutRichPlaceholder")}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Box>
            )}
          />

          <WorkoutItemsEditor
            mode="client"
            planId={undefined}
            planVenue={planVenueForPicker}
            initialItems={lines}
            showSaveButton={false}
            onChange={setLines}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6">{t("clients.plans.notesSectionTitle")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("clients.plans.notesSectionHint")}
          </Typography>

          <Controller
            name="workout_plan"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                margin="normal"
                multiline
                minRows={6}
                label={t("clients.plans.workoutNotesLabel")}
                placeholder={t("clients.plans.workoutPlaceholder")}
                inputProps={{ maxLength: 32000 }}
              />
            )}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">{t("clients.plans.workoutTemplatesSectionTitle")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("clients.plans.workoutTemplatesHint")}
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Button component={Link} to="/training-plans/create" variant="contained">
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
                      const pid = Number(r.id);
                      const isAssigned =
                        assignedTrainingPlanId != null && pid === assignedTrainingPlanId;
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
                              onClick={() => void applyTrainingPlan(Number(r.id))}
                            >
                              {t("clients.plans.workoutTemplateApply")}
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

          <Typography variant="h6">{t("clients.plans.templatesSectionTitle")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("clients.plans.templateApplyHint")}
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Button component={Link} to="/nutrition-templates/create" variant="contained">
              {t("clients.plans.newTemplate")}
            </Button>
          </Box>
          <Stack spacing={2} sx={{ mb: 2, width: "100%" }}>
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
                      const nid = Number(r.id);
                      const isAssigned =
                        assignedNutritionTemplateId != null && nid === assignedNutritionTemplateId;
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
                              onClick={() => void applyNutritionTemplate(Number(r.id))}
                            >
                              {t("clients.plans.templateApply")}
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

          <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />

          <Controller
            name="diet_plan"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                margin="normal"
                multiline
                minRows={8}
                label={t("clients.plans.dietLabel")}
                placeholder={t("clients.plans.dietPlaceholder")}
                inputProps={{ maxLength: 32000 }}
              />
            )}
          />

          <Divider sx={{ my: 2 }} />
          {saveButtons}
        </>
      ) : null}
      <Dialog open={preview != null} onClose={() => setPreview(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Full workout and diet preview</DialogTitle>
        <DialogContent dividers>
          {preview ? (
            <CoachingPlanPreview
              clientName={`Client #${clientId}`}
              programVenue={preview.values.program_venue}
              workoutRichHtml={preview.values.workout_rich_html}
              workoutNotes={preview.values.workout_plan}
              workoutLines={preview.lines}
              dietMeals={preview.dietMeals}
              dietNotes={preview.values.diet_plan}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button component={Link} to={clientPlanViewerPath(clientId)} variant="contained">
            Open full viewer
          </Button>
          <Button onClick={() => setPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  if (embed) {
    return (
      <div className="client-coaching-editor-embed" style={{ paddingTop: 4, maxWidth: 960 }}>
        <Card className="client-section-card client-section-card--editable">
          <CardContent sx={{ pt: 2 }}>
            <Typography variant="h6" sx={{ mt: 0 }}>
              {t("clients.plans.embedTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("clients.plans.embedSubtitle")}
            </Typography>
            {inner}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardContent sx={{ pt: 2 }}>{inner}</CardContent>
    </Card>
  );
}
