import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ExerciseCreate() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "exercises" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("exercises.form.createHint")}{" "}
        <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
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
        <Form.Item name="muscle_groups" label={t("exercises.form.muscleGroups")}>
          <Input placeholder={t("exercises.form.muscleGroupsPh")} />
        </Form.Item>
        <Form.Item name="equipment" label={t("exercises.form.equipment")}>
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
}
