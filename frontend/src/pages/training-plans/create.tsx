import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export function TrainingPlanCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "training-plans" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Create>
  );
}
