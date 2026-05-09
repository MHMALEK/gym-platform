import GroupAddIcon from "@mui/icons-material/GroupAddRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useForm } from "@refinedev/react-hook-form";
import { Layers, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
import { PageHeader } from "../../components/layout/PageHeader";
import { StickyActionBar } from "../../components/layout/StickyActionBar";
import {
  WorkoutItemsEditor,
  workoutLinesFromApiItems,
} from "../../components/WorkoutItemsEditor";
import type { WorkoutItemsEditorHandle } from "../../components/workout-builder/types";
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
  const [assignOpen, setAssignOpen] = useState(false);
  const [tab, setTab] = useState<0 | 1>(0);

  const editorRef = useRef<WorkoutItemsEditorHandle>(null);
  const formAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { control, watch, refineCore } = useForm<FormValues>({
    refineCoreProps: { resource: "training-plans" },
  });
  const query = refineCore.query;
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueLive = watch("venue_type") ?? record?.venue_type ?? "mixed";

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
    formAutoSaveTimerRef.current = setTimeout(() => {
      void refineCore.onFinish(watchedValues);
      lastSavedJSON.current = watchedJSON;
    }, 1500);
    return () => {
      if (formAutoSaveTimerRef.current) clearTimeout(formAutoSaveTimerRef.current);
    };
  }, [watchedJSON, record?.id, refineCore, watchedValues]);

  const headerActions = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<GroupAddIcon fontSize="small" />}
      disabled={record?.id == null}
      onClick={() => setAssignOpen(true)}
      sx={{ borderRadius: 2 }}
    >
      {t("assignPlanToClients.assignToClientsButton")}
    </Button>
  );

  return (
    <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
      <PageHeader
        title={record?.name || t("trainingPlans.edit.pageTitle") || "Training plan"}
        subtitle={
          t("trainingPlans.edit.pageSubtitle") !== "trainingPlans.edit.pageSubtitle"
            ? t("trainingPlans.edit.pageSubtitle")
            : undefined
        }
        actions={headerActions}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as 0 | 1)}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
          minHeight: 40,
          "& .MuiTab-root": {
            minHeight: 40,
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            px: 1.5,
          },
        }}
      >
        <Tab label={t("trainingPlans.create.stepBasicsTitle")} />
        <Tab label={t("trainingPlans.create.stepProgramTitle")} />
      </Tabs>

      <Box component="form" sx={{ display: tab === 0 ? "block" : "none" }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanOverviewCard control={control} variant="edit" />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: tab === 1 ? "block" : "none" }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanWorkoutRichField control={control} />
          </CardContent>
        </Card>
        <Card>
          <CardContent
            sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}
          >
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
              />
            ) : null}
          </CardContent>
        </Card>
      </Box>

      <StickyActionBar>
        {/* Sticky bar replaces the legacy Save/Cancel: with both items and
            form fields auto-saving, the user just adds content. The
            auto-save status indicator inside the workout builder confirms
            persistence. */}
        {tab === 1 ? (
          <>
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
          </>
        ) : null}
      </StickyActionBar>

      <AssignPlanToClientsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        mode="training"
        resourceId={record?.id ?? 0}
        resourceName={record?.name}
      />
    </Box>
  );
}
