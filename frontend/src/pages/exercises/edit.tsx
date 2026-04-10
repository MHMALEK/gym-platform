import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";

import { MuscleGroupSelect } from "../../components/MuscleGroupSelect";
import { useParams } from "react-router-dom";

import { ExerciseMediaGallery } from "../../components/ExerciseMediaGallery";

export function ExerciseEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { formProps, saveButtonProps } = useForm({ resource: "exercises" });

  const venueOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Edit saveButtonProps={saveButtonProps}>
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
        <Form.Item name="muscle_group_ids" label={t("exercises.form.muscleGroups")}>
          <MuscleGroupSelect />
        </Form.Item>
        <Form.Item name="equipment" label={t("exercises.form.equipment")}>
          <Input />
        </Form.Item>
        <Form.Item name="venue_type" label={t("exercises.form.venue")}>
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
      {id ? <ExerciseMediaGallery exerciseId={id} /> : null}
    </Edit>
  );
}
