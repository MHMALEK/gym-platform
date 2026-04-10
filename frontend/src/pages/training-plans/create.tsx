import { Create, useForm } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import { App, Form } from "antd";
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

  return (
    <Create saveButtonProps={saveButtonProps} title={t("trainingPlans.create.pageTitle")}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          venue_type: "mixed",
          workout_rich_html: "",
          ...formProps.initialValues,
        }}
      >
        <TrainingPlanOverviewCard variant="create" />
        <TrainingPlanWorkoutRichField />
      </Form>
      <WorkoutItemsEditor
        mode="training-plan"
        planVenue={venueType}
        initialItems={workoutLines}
        showSaveButton={false}
        onChange={onWorkoutChange}
      />
    </Create>
  );
}
