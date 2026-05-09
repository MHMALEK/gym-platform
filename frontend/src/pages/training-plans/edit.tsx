import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useForm } from "@refinedev/react-hook-form";
import { Check, Eye, Layers, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CoachingPlanPreview } from "../../components/CoachingPlanPreview";
import { PageHeader } from "../../components/layout/PageHeader";
import { StickyActionBar } from "../../components/layout/StickyActionBar";
import {
  type WorkoutLine,
  WorkoutItemsEditor,
  workoutLinesFromApiItems,
} from "../../components/WorkoutItemsEditor";
import type {
  SaveStatus,
  WorkoutItemsEditorHandle,
} from "../../components/workout-builder/types";
import { trainingPlanPreviewPath } from "./preview";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type Item = {
  id: number;
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
  block_sequence?: number | null;
  exercise?: { id: number; name: string };
};

type PlanRecord = {
  id?: number;
  name?: string;
  venue_type?: string;
  workout_rich_html?: string | null;
  items?: Item[];
};

type FormValues = {
  name: string;
  description?: string;
  venue_type: string;
  workout_rich_html: string;
};

const PAGE_MAX_WIDTH = "100%";

export function TrainingPlanEdit() {
  const { t } = useTranslation();

  const editorRef = useRef<WorkoutItemsEditorHandle>(null);
  const formAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { control, watch, refineCore, reset } = useForm<FormValues>({
    refineCoreProps: {
      resource: "training-plans",
      // Stay on the edit page after a save — auto-save would otherwise
      // bounce the user back to the list every debounce.
      redirect: false,
      // Suppress Refine's success toast on every PATCH; the sticky-bar
      // status indicator gives quieter, persistent feedback instead.
      successNotification: false,
    },
  });

  /** Combined items + form auto-save state, surfaced in the sticky bar. */
  const [itemsSaveStatus, setItemsSaveStatus] = useState<SaveStatus>("idle");
  const [formSaveStatus, setFormSaveStatus] = useState<SaveStatus>("idle");
  const [currentLines, setCurrentLines] = useState<WorkoutLine[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const formSavedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onItemsSaveStatusChange = useCallback((s: SaveStatus) => {
    setItemsSaveStatus(s);
  }, []);
  const combinedSaveStatus: SaveStatus =
    itemsSaveStatus === "saving" || formSaveStatus === "saving"
      ? "saving"
      : itemsSaveStatus === "saved" || formSaveStatus === "saved"
        ? "saved"
        : "idle";
  const query = refineCore.query;
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueLive = watch("venue_type") ?? record?.venue_type ?? "mixed";

  useEffect(() => {
    setCurrentLines(initialLines);
  }, [initialLines]);

  /** Form auto-save: 1500ms after the last edit, push through Refine's
   *  mutation. The lastSaved ref captures the loaded baseline on first
   *  arrival so we don't echo the just-fetched record back to the
   *  server, and updates after each save so identical re-typing doesn't
   *  re-trigger the timer. */
  const watchedValues = watch();
  const watchedJSON = JSON.stringify(watchedValues);
  const lastSavedJSON = useRef<string | null>(null);
  useEffect(() => {
    if (!record?.id) return;
    if (lastSavedJSON.current === null) {
      lastSavedJSON.current = watchedJSON;
      return;
    }
    if (lastSavedJSON.current === watchedJSON) return;
    if (formAutoSaveTimerRef.current) clearTimeout(formAutoSaveTimerRef.current);
    formAutoSaveTimerRef.current = setTimeout(async () => {
      setFormSaveStatus("saving");
      try {
        await refineCore.onFinish(watchedValues);
        lastSavedJSON.current = watchedJSON;
        reset(watchedValues, { keepValues: true, keepDirty: false });
        setFormSaveStatus("saved");
        if (formSavedFlashRef.current) clearTimeout(formSavedFlashRef.current);
        formSavedFlashRef.current = setTimeout(() => setFormSaveStatus("idle"), 1800);
      } catch {
        setFormSaveStatus("idle");
      }
    }, 1500);
    return () => {
      if (formAutoSaveTimerRef.current) clearTimeout(formAutoSaveTimerRef.current);
    };
  }, [watchedJSON, record?.id, refineCore, watchedValues, reset]);

  return (
    <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
      <PageHeader
        title={record?.name || t("trainingPlans.edit.pageTitle") || "Training plan"}
        subtitle={
          t("trainingPlans.edit.pageSubtitle") !== "trainingPlans.edit.pageSubtitle"
            ? t("trainingPlans.edit.pageSubtitle")
            : undefined
        }
      />

      {/* Single scrolling page — Details + Program live together. Three
          stacked sections separated by sub-headings, all auto-saving. */}
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <SectionHeading
              title={t("trainingPlans.create.stepBasicsTitle")}
              subtitle={t("trainingPlans.create.stepBasicsHint")}
            />
            <TrainingPlanOverviewCard control={control} variant="edit" />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <SectionHeading
              title={t("workouts.richSectionTitle")}
              subtitle={t("workouts.richSectionDesc")}
            />
            <TrainingPlanWorkoutRichField control={control} />
          </CardContent>
        </Card>

        <Card>
          <CardContent
            sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}
          >
            <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: 0.5 }}>
              <SectionHeading
                title={t("trainingPlans.create.stepProgramTitle")}
                subtitle={t("trainingPlans.create.stepProgramHint")}
              />
            </Box>
            {query?.isLoading ? (
              <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : record?.id ? (
              <WorkoutItemsEditor
                ref={editorRef}
                mode="training-plan"
                planId={record.id}
                planVenue={venueLive}
                initialItems={initialLines}
                showSaveButton={false}
                hideHeader
                hideAddButtons
                hideSaveIndicator
                onChange={setCurrentLines}
                onSaveStatusChange={onItemsSaveStatusChange}
              />
            ) : null}
          </CardContent>
        </Card>
      </Box>

      <StickyActionBar>
        {/* Quiet auto-save status: lives on the left of the bar, replaces
            the Refine success toast that used to fire on every save. */}
        <StickyAutoSaveStatus status={combinedSaveStatus} t={t} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="medium"
          startIcon={<Eye size={16} strokeWidth={2.25} />}
          onClick={() => setPreviewOpen(true)}
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            color: "text.secondary",
            borderColor: "divider",
            px: 1.75,
            "&:hover": {
              color: "primary.main",
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
        >
          Preview
        </Button>
        {record?.id ? (
          <Button
            component={Link}
            to={trainingPlanPreviewPath(record.id)}
            variant="outlined"
            size="medium"
            sx={{
              borderRadius: 1.5,
              fontWeight: 500,
              textTransform: "none",
              color: "text.secondary",
              borderColor: "divider",
              px: 1.75,
              "&:hover": {
                color: "primary.main",
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
          >
            Open preview page
          </Button>
        ) : null}
        <Button
          variant="contained"
          color="primary"
          size="medium"
          startIcon={<Plus size={16} strokeWidth={2.25} />}
          onClick={() => editorRef.current?.openAddExercise()}
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            px: 2,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          }}
        >
          {t("workouts.addExercise")}
        </Button>
        <Button
          variant="outlined"
          size="medium"
          startIcon={<Layers size={16} strokeWidth={2.25} />}
          onClick={() => editorRef.current?.openAddGroup()}
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            color: "text.secondary",
            borderColor: "divider",
            px: 1.75,
            "&:hover": {
              color: "primary.main",
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
        >
          {t("workouts.addSuperset")}
        </Button>
      </StickyActionBar>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Workout preview</DialogTitle>
        <DialogContent dividers>
          <CoachingPlanPreview
            title={watchedValues.name || record?.name || "Workout plan"}
            eyebrow="Workout preview"
            programVenue={venueLive}
            workoutRichHtml={watchedValues.workout_rich_html}
            workoutNotes={watchedValues.description}
            workoutLines={currentLines.length ? currentLines : initialLines}
            dietMeals={[]}
            showDiet={false}
          />
        </DialogContent>
        <DialogActions>
          {record?.id ? (
            <Button component={Link} to={trainingPlanPreviewPath(record.id)} variant="contained">
              Open preview page
            </Button>
          ) : null}
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Sticky-bar auto-save status. Quiet by default; flashes "Saving…" /
 *  "Saved" while activity is in flight, idle hint while at rest. */
function StickyAutoSaveStatus({
  status,
  t,
}: {
  status: SaveStatus;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (status === "idle") {
    return (
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ fontSize: 12, fontStyle: "italic" }}
      >
        {t("workouts.autoSaveIdle") !== "workouts.autoSaveIdle"
          ? t("workouts.autoSaveIdle")
          : "Auto-saves as you edit"}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      {status === "saving" ? (
        <Loader2 size={14} strokeWidth={2.25} className="ws-status-spin" />
      ) : (
        <Check size={14} strokeWidth={2.5} />
      )}
      <Typography
        variant="caption"
        sx={{
          fontSize: 12,
          fontWeight: 500,
          color: status === "saving" ? "text.secondary" : "success.main",
        }}
      >
        {status === "saving"
          ? t("workouts.autoSaving") !== "workouts.autoSaving"
            ? t("workouts.autoSaving")
            : "Saving…"
          : t("workouts.autoSaved") !== "workouts.autoSaved"
            ? t("workouts.autoSaved")
            : "Saved"}
      </Typography>
    </Box>
  );
}

/** Compact section title used to demarcate the Details / Overview / Program
 *  sections that used to live in separate tabs. */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        component="h2"
        sx={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", color: "text.primary" }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mt: 0.25 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
