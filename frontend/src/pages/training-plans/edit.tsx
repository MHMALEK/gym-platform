import { Edit, useForm } from "@refinedev/antd";
import { Form, Spin } from "antd";
import { useMemo } from "react";

import { WorkoutItemsEditor, workoutLinesFromApiItems } from "../../components/WorkoutItemsEditor";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type Item = {
  id: number;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
  exercise?: { id: number; name: string };
};

type PlanRecord = {
  id?: number;
  venue_type?: string;
  workout_rich_html?: string | null;
  items?: Item[];
};

export function TrainingPlanEdit() {
  const { formProps, saveButtonProps, query, form } = useForm({ resource: "training-plans" });
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueLive = Form.useWatch("venue_type", form) ?? record?.venue_type ?? "mixed";

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <TrainingPlanOverviewCard variant="edit" />
        <TrainingPlanWorkoutRichField />
      </Form>

      {query?.isLoading ? (
        <Spin style={{ marginTop: 24 }} />
      ) : record?.id ? (
        <WorkoutItemsEditor
          mode="training-plan"
          planId={record.id}
          planVenue={venueLive}
          initialItems={initialLines}
          showSaveButton
        />
      ) : null}
    </Edit>
  );
}
