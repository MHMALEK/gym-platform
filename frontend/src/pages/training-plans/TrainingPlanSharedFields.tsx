import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Card, Form, Input, Select, Typography } from "antd";
import { useTranslation } from "react-i18next";

import { WorkoutRichEditor } from "../../components/WorkoutRichEditor";

export function TrainingPlanOverviewCard({ variant }: { variant: "create" | "edit" }) {
  const { t } = useTranslation();
  const Icon = variant === "create" ? PlusOutlined : EditOutlined;
  const venueOptions = [
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
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
        <Icon style={{ marginInlineEnd: 8, opacity: 0.85 }} />
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
  );
}

export function TrainingPlanWorkoutRichField() {
  const { t } = useTranslation();
  return (
    <Form.Item
      name="workout_rich_html"
      label={t("workouts.richSectionTitle")}
      valuePropName="value"
      getValueFromEvent={(v: string) => v}
    >
      <WorkoutRichEditor placeholder={t("workouts.richPlaceholder")} />
    </Form.Item>
  );
}
