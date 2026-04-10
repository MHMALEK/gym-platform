import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export function ExerciseEdit() {
  const { formProps, saveButtonProps } = useForm({ resource: "exercises" });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="category" label="Category">
          <Input />
        </Form.Item>
        <Form.Item name="muscle_groups" label="Muscle groups">
          <Input />
        </Form.Item>
        <Form.Item name="equipment" label="Equipment">
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
}
