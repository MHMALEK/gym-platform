import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import { useTranslation } from "react-i18next";

export function ExerciseEdit() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "exercises" });

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
        <Form.Item name="muscle_groups" label={t("exercises.form.muscleGroups")}>
          <Input />
        </Form.Item>
        <Form.Item name="equipment" label={t("exercises.form.equipment")}>
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
}
