import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form } from "antd";

import { ClientFormSections } from "./formSections";

export function ClientCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "clients" });

  const { selectProps: goalTypeSelectProps } = useSelect({
    resource: "directory-goal-types",
    optionLabel: "label",
    optionValue: "id",
    pagination: { current: 1, pageSize: 100, mode: "server" },
  });

  const { selectProps: planSelectProps } = useSelect({
    resource: "plan-templates",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <ClientFormSections
          goalTypeSelectProps={goalTypeSelectProps}
          planSelectProps={planSelectProps}
          isCreate
        />
      </Form>
    </Create>
  );
}
