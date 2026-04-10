import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { MuscleGroupSelect } from "../../components/MuscleGroupSelect";

export function ExerciseCreate() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "exercises" });

  const venueOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("exercises.form.createHint")}{" "}
        <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("exercises.mediaGallery.afterCreateHint")}
      </Typography.Paragraph>
      <Form {...formProps} layout="vertical">
        <Form.Item name="name" label={t("exercises.form.name")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t("exercises.form.description")}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="category" label={t("exercises.form.category")}>
          <Input />
        </Form.Item>
        <Form.Item name="muscle_group_ids" label={t("exercises.form.muscleGroups")} initialValue={[]}>
          <MuscleGroupSelect />
        </Form.Item>
        <Form.Item name="equipment" label={t("exercises.form.equipment")}>
          <Input />
        </Form.Item>
        <Form.Item name="venue_type" label={t("exercises.form.venue")} initialValue="both">
          <Select options={venueOptions} />
        </Form.Item>
        <Form.Item name="tips" label={t("exercises.form.tips")}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="common_mistakes" label={t("exercises.form.commonMistakes")}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="correct_form_cues" label={t("exercises.form.correctFormCues")}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="demo_media_url" label={t("exercises.form.demoMediaUrl")}>
          <Input type="url" />
        </Form.Item>
        <Form.Item name="thumbnail_url" label={t("exercises.form.thumbnailUrl")}>
          <Input type="url" />
        </Form.Item>
      </Form>
    </Create>
  );
}
