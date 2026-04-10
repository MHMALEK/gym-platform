import { EditOutlined } from "@ant-design/icons";
import { Edit, useForm } from "@refinedev/antd";
import { Card, Form, Input, Select, Spin, Typography } from "antd";
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
  workout_rich_html?: string | null;
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
        <Card
          size="small"
          style={{
            marginBottom: 24,
            background: "var(--app-surface-elevated, rgba(15, 23, 42, 0.45))",
            borderColor: "var(--app-border, rgba(148, 163, 184, 0.2))",
          }}
          styles={{ body: { paddingBottom: 8 } }}
        >
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            <EditOutlined style={{ marginInlineEnd: 8, opacity: 0.85 }} />
            {t("trainingPlans.form.planOverviewTitle")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            {t("trainingPlans.form.planOverviewHint")}
          </Typography.Paragraph>
          <Form.Item name="name" label={t("trainingPlans.list.name")} rules={[{ required: true }]}>
            <Input
              size="large"
              placeholder={t("trainingPlans.form.namePlaceholder")}
              maxLength={160}
              showCount
            />
          </Form.Item>
          <Form.Item name="description" label={t("trainingPlans.list.description")}>
            <Input.TextArea
              rows={3}
              showCount
              maxLength={2000}
              placeholder={t("trainingPlans.form.descriptionPlaceholder")}
            />
          </Form.Item>
          <Form.Item name="venue_type" label={t("trainingPlans.form.venue")}>
            <Select options={venueOptions} size="large" />
          </Form.Item>
        </Card>
        <Form.Item
          name="workout_rich_html"
          label={t("workouts.richSectionTitle")}
          valuePropName="value"
          getValueFromEvent={(v: string) => v}
        >
          <WorkoutRichEditor placeholder={t("workouts.richPlaceholder")} />
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
