import { Create, useForm } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Form, Grid, Space, Steps, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  WorkoutItemsEditor,
  normalizeWorkoutItemsForApi,
  type WorkoutLine,
} from "../../components/WorkoutItemsEditor";
import { apiPrefix, authHeaders } from "../../lib/api";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type CreateResponseShape = { id?: number };

export function TrainingPlanCreate() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const screens = Grid.useBreakpoint();
  const [step, setStep] = useState(0);
  const [workoutLines, setWorkoutLines] = useState<WorkoutLine[]>([]);

  const { formProps, saveButtonProps, form } = useForm({
    resource: "training-plans",
    redirect: false,
    onMutationSuccess: async (result) => {
      const id = (result as { data?: CreateResponseShape })?.data?.id;
      if (id == null) {
        message.error(t("trainingPlans.create.missingId"));
        return;
      }
      try {
        const payload = normalizeWorkoutItemsForApi(workoutLines);
        if (payload.length > 0) {
          const res = await fetch(`${apiPrefix}/training-plans/${id}/items`, {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            message.error(t("trainingPlans.create.itemsSaveFailed"));
          }
        }
      } catch {
        message.error(t("trainingPlans.create.itemsSaveFailed"));
      }
      await invalidate({ resource: "training-plans", invalidates: ["list"] });
      navigate(`/training-plans/edit/${id}`, { replace: true });
    },
  });

  const venueType = Form.useWatch("venue_type", form) ?? "mixed";

  const onWorkoutChange = useCallback((next: WorkoutLine[]) => {
    setWorkoutLines(next);
  }, []);

  const goNext = useCallback(async () => {
    try {
      await form.validateFields(["name", "venue_type"]);
      setStep(1);
    } catch {
      /* validation errors shown on fields */
    }
  }, [form]);

  const bodyStyle = { maxWidth: 960, margin: "0 auto", width: "100%" as const };

  return (
    <Create
      title={t("trainingPlans.create.pageTitle")}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
      footerButtons={({ saveButtonProps: sp }) => (
        <Space wrap>
          {step === 1 ? (
            <Button onClick={() => setStep(0)}>{t("trainingPlans.create.backToDetails")}</Button>
          ) : null}
          {step === 0 ? (
            <Button type="primary" onClick={() => void goNext()}>
              {t("trainingPlans.create.continueToProgram")}
            </Button>
          ) : (
            <Button type="primary" {...sp}>
              {t("trainingPlans.create.savePlan")}
            </Button>
          )}
        </Space>
      )}
    >
      <div style={bodyStyle}>
        <Steps
          current={step}
          size="small"
          direction={screens.md ? "horizontal" : "vertical"}
          style={{ marginBottom: 20 }}
          items={[
            {
              title: t("trainingPlans.create.stepBasicsTitle"),
              description: t("trainingPlans.create.stepBasicsDesc"),
            },
            {
              title: t("trainingPlans.create.stepProgramTitle"),
              description: t("trainingPlans.create.stepProgramDesc"),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {step === 0 ? t("trainingPlans.create.stepBasicsHint") : t("trainingPlans.create.stepProgramHint")}
        </Typography.Paragraph>
      </div>

      <Form
        {...formProps}
        form={form}
        layout="vertical"
        style={bodyStyle}
        initialValues={{
          venue_type: "mixed",
          workout_rich_html: "",
          ...formProps.initialValues,
        }}
      >
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <TrainingPlanOverviewCard variant="create" />
        </div>
        <div style={{ display: step === 1 ? "block" : "none" }}>
          <TrainingPlanWorkoutRichField />
        </div>
      </Form>
      {step === 1 ? (
        <div style={bodyStyle}>
          <WorkoutItemsEditor
            mode="training-plan"
            planVenue={venueType}
            initialItems={workoutLines}
            showSaveButton={false}
            onChange={onWorkoutChange}
          />
        </div>
      ) : null}
    </Create>
  );
}
