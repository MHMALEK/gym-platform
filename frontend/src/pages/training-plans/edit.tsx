import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, Spin } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { WorkoutItemsEditor, workoutLinesFromApiItems } from "../../components/WorkoutItemsEditor";
import { WorkoutRichEditor } from "../../components/WorkoutRichEditor";

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
  items?: Item[];
};

export function TrainingPlanEdit() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps, query } = useForm({ resource: "training-plans" });
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueOptions = [
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item name="name" label={t("trainingPlans.list.name")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t("trainingPlans.list.description")}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="venue_type" label={t("trainingPlans.form.venue")}>
          <Select options={venueOptions} />
        </Form.Item>
      </Form>

      {query?.isLoading ? (
        <Spin style={{ marginTop: 24 }} />
      ) : record?.id ? (
        <WorkoutItemsEditor
          mode="training-plan"
          planId={record.id}
          planVenue={record.venue_type ?? null}
          initialItems={initialLines}
          showSaveButton
        />
      ) : null}
    </Edit>
  );
}
