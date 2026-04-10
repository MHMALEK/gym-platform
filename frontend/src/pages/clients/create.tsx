import { Create, SaveButton, useForm, useSelect } from "@refinedev/antd";
import { Button, Form, Space, Steps, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { ClientFormSections } from "./formSections";

const WIZARD_FIELD_GROUPS: [string[], string[]] = [
  ["name", "email", "phone"],
  ["weight_kg", "height_cm", "goal_type_id", "goal"],
];

export function ClientCreate() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const { formProps, saveButtonProps, form } = useForm({
    resource: "clients",
    redirect: "edit",
  });

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

  const handleNext = useCallback(async () => {
    if (step >= 2) return;
    try {
      await form.validateFields(WIZARD_FIELD_GROUPS[step]);
    } catch {
      return;
    }
    setStep((s) => s + 1);
  }, [form, step]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  return (
    <Create
      saveButtonProps={saveButtonProps}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
      footerButtons={({ saveButtonProps: sp }) => (
        <Space wrap>
          {step > 0 ? (
            <Button onClick={handleBack}>{t("clients.wizard.back")}</Button>
          ) : null}
          {step < 2 ? (
            <Button type="primary" onClick={() => void handleNext()}>
              {t("clients.wizard.next")}
            </Button>
          ) : (
            <SaveButton {...sp} />
          )}
        </Space>
      )}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Steps
          current={step}
          items={[
            { title: t("clients.wizard.stepContact") },
            { title: t("clients.wizard.stepBodyGoals") },
            { title: t("clients.wizard.stepPlanAccount") },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("clients.wizard.intro")}
        </Typography.Paragraph>
        <Form {...formProps} layout="vertical">
          <ClientFormSections
            goalTypeSelectProps={goalTypeSelectProps}
            planSelectProps={planSelectProps}
            isCreate
            createWizardStep={step as 0 | 1 | 2}
          />
        </Form>
      </Space>
    </Create>
  );
}
