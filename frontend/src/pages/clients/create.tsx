import { Create, useSelect } from "@refinedev/antd";
import { useCreate } from "@refinedev/core";
import { App, Button, Form, Grid, Space, Steps, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";
import { ClientFormSections } from "./formSections";

const WIZARD_FIELD_GROUPS = [
  ["name", "email", "phone"],
  ["weight_kg", "height_cm", "goal_type_id", "goal"],
  ["subscription_plan_template_id", "status", "account_status", "notes"],
] as const;

function toClientPayload(v: Record<string, unknown>) {
  return {
    name: String(v.name ?? "").trim(),
    email: v.email ? String(v.email).trim() : null,
    phone: v.phone ? String(v.phone).trim() : null,
    notes: v.notes ? String(v.notes).trim() : null,
    weight_kg: v.weight_kg != null && v.weight_kg !== "" ? v.weight_kg : null,
    height_cm: v.height_cm != null && v.height_cm !== "" ? v.height_cm : null,
    goal_type_id: v.goal_type_id ?? null,
    goal: v.goal ? String(v.goal).trim() : null,
    subscription_plan_template_id: v.subscription_plan_template_id ?? null,
    status: v.status ?? "active",
    account_status: v.account_status ?? "good_standing",
  };
}

const STEP_HINT_KEYS = ["hintStep0", "hintStep1", "hintStep2", "hintStep3"] as const;

export function ClientCreate() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();

  const { mutateAsync: createClient, isPending } = useCreate({
    successNotification: false,
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
    if (step >= WIZARD_FIELD_GROUPS.length) return;
    try {
      await form.validateFields([...WIZARD_FIELD_GROUPS[step]]);
    } catch {
      return;
    }
    setStep((s) => s + 1);
  }, [form, step]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const finish = useCallback(
    async (skipPlans: boolean) => {
      try {
        await form.validateFields();
      } catch {
        return;
      }
      const v = form.getFieldsValue(true) as Record<string, unknown>;
      const payload = toClientPayload(v);
      try {
        const res = await createClient({ resource: "clients", values: payload });
        const id = (res.data as { id?: number })?.id;
        if (id == null) {
          message.error(t("clients.wizard.createFailed"));
          return;
        }

        let plansSaved = false;
        if (!skipPlans) {
          const workout = typeof v.workout_plan === "string" ? v.workout_plan.trim() : "";
          const diet = typeof v.diet_plan === "string" ? v.diet_plan.trim() : "";
          if (workout || diet) {
            const putRes = await fetch(`${apiPrefix}/clients/${id}/coaching-plans`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({
                workout_plan: workout || null,
                diet_plan: diet || null,
              }),
            });
            if (!putRes.ok) {
              message.error(t("clients.wizard.plansSaveFailed"));
            } else {
              plansSaved = true;
            }
          }
        }

        message.success(
          plansSaved ? t("clients.wizard.createdWithPlans") : t("clients.wizard.created"),
        );
        navigate(`/clients/edit/${id}`);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : t("clients.wizard.createFailed");
        message.error(msg);
      }
    },
    [createClient, form, message, navigate, t],
  );

  return (
    <Create
      isLoading={isPending}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
      footerButtons={() => (
        <Space wrap>
          {step > 0 ? (
            <Button onClick={handleBack} disabled={isPending}>
              {t("clients.wizard.back")}
            </Button>
          ) : null}
          {step < WIZARD_FIELD_GROUPS.length ? (
            <Button type="primary" onClick={() => void handleNext()} disabled={isPending}>
              {t("clients.wizard.next")}
            </Button>
          ) : (
            <>
              <Button onClick={() => void finish(true)} disabled={isPending}>
                {t("clients.wizard.skipPlans")}
              </Button>
              <Button type="primary" onClick={() => void finish(false)} loading={isPending}>
                {t("clients.wizard.saveClient")}
              </Button>
            </>
          )}
        </Space>
      )}
    >
      <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 840, margin: "0 auto" }}>
        <Steps
          current={step}
          size="small"
          direction={screens.md ? "horizontal" : "vertical"}
          items={[
            { title: t("clients.wizard.stepContact") },
            { title: t("clients.wizard.stepBodyGoals") },
            { title: t("clients.wizard.stepPlanAccount") },
            { title: t("clients.wizard.stepWorkoutDiet") },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 14, lineHeight: 1.55 }}>
          {t(`clients.wizard.${STEP_HINT_KEYS[step]}`)}
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <ClientFormSections
            goalTypeSelectProps={goalTypeSelectProps}
            planSelectProps={planSelectProps}
            isCreate
            createWizardStep={step as 0 | 1 | 2 | 3}
          />
        </Form>
      </Space>
    </Create>
  );
}
