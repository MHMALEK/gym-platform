import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { WorkoutItemsEditor, workoutLinesFromApiItems } from "../../components/WorkoutItemsEditor";

type Item = {
  id: number;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
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
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>{record?.name}</Typography.Title>
      <Typography.Paragraph>{record?.description}</Typography.Paragraph>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {t("workouts.planVenueLabel")}: {t(`workouts.venue.${record?.venue_type ?? "mixed"}`)}
      </Typography.Text>

      {record?.workout_rich_html ? (
        <div style={{ marginBottom: 20 }}>
          <Typography.Title level={5}>{t("workouts.richSectionTitle")}</Typography.Title>
          <div
            className="workout-rich-preview"
            dangerouslySetInnerHTML={{ __html: record.workout_rich_html }}
          />
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
