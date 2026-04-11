import { PlusOutlined } from "@ant-design/icons";
import { Edit, useForm } from "@refinedev/antd";
import { Button, Form, Space, Spin } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  block_id?: string | null;
  block_type?: string | null;
  block_sequence?: number | null;
  exercise?: { id: number; name: string };
};

type PlanRecord = {
  id?: number;
  venue_type?: string;
  workout_rich_html?: string | null;
  items?: Item[];
};

export function TrainingPlanEdit() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps, query, form } = useForm({ resource: "training-plans" });
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueLive = Form.useWatch("venue_type", form) ?? record?.venue_type ?? "mixed";

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Space wrap size="small">
            <Link to="/training-plans/create">
              <Button type="default" icon={<PlusOutlined />} size="middle">
                {t("common.quickLinks.newWorkout")}
              </Button>
            </Link>
            <Link to="/exercises/create">
              <Button type="default" size="middle">
                {t("common.quickLinks.newExercise")}
              </Button>
            </Link>
          </Space>
        </>
      )}
    >
      <Form {...formProps} form={form} layout="vertical">
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
