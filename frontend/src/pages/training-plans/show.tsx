import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/mui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { WorkoutItemsEditor, workoutLinesFromApiItems } from "../../components/WorkoutItemsEditor";
import { trainingPlanPreviewPath } from "./preview";

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
  description?: string;
  workout_rich_html?: string | null;
  venue_type?: string;
  items?: Item[];
};

export function TrainingPlanShow() {
  const { t } = useTranslation();
  const { query } = useShow({ resource: "training-plans" });
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  return (
    <Show
      isLoading={query?.isLoading}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          {record?.id ? (
            <Button component={Link} to={trainingPlanPreviewPath(record.id)} variant="contained" size="small">
              Preview workout
            </Button>
          ) : null}
        </>
      )}
    >
      <Typography variant="h6">{record?.name}</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        {record?.description}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        {t("workouts.planVenueLabel")}: {t(`workouts.venue.${record?.venue_type ?? "mixed"}`)}
      </Typography>

      {record?.workout_rich_html ? (
        <div style={{ marginBottom: 20 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("workouts.richSectionTitle")}
          </Typography>
          <div className="workout-rich-preview" dangerouslySetInnerHTML={{ __html: record.workout_rich_html }} />
        </div>
      ) : null}

      {record?.id ? (
        <WorkoutItemsEditor
          mode="training-plan"
          planId={record.id}
          planVenue={record.venue_type ?? null}
          initialItems={initialLines}
          showSaveButton
        />
      ) : null}
    </Show>
  );
}
