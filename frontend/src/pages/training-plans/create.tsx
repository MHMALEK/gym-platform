import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";

export function TrainingPlanCreate() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "training-plans" });

  const venueOptions = [
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item name="name" label={t("trainingPlans.list.name")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t("trainingPlans.list.description")}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="venue_type" label={t("trainingPlans.form.venue")} initialValue="mixed">
          <Select options={venueOptions} />
        </Form.Item>
      </Form>
    </Create>
  );
}
