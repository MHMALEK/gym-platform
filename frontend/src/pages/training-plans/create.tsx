import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useInvalidate } from "@refinedev/core";
import { Create } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  WorkoutItemsEditor,
  normalizeWorkoutItemsForApi,
  type WorkoutLine,
} from "../../components/WorkoutItemsEditor";
import { useAppMessage } from "../../lib/useAppMessage";
import { apiPrefix, authHeaders } from "../../lib/api";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type CreateResponseShape = { id?: number };

type FormValues = {
  name: string;
  description?: string;
  venue_type: string;
  workout_rich_html: string;
};

export function TrainingPlanCreate() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const isMdUp = useMediaQuery("(min-width:900px)");
  const [step, setStep] = useState(0);
  const [workoutLines, setWorkoutLines] = useState<WorkoutLine[]>([]);

  const { control, saveButtonProps, trigger, watch } = useForm<FormValues>({
    refineCoreProps: {
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
    },
    defaultValues: {
      venue_type: "mixed",
      workout_rich_html: "",
      name: "",
      description: "",
    },
  });

  const venueType = watch("venue_type") ?? "mixed";

  const onWorkoutChange = useCallback((next: WorkoutLine[]) => {
    setWorkoutLines(next);
  }, []);

  const goNext = useCallback(async () => {
    const ok = await trigger(["name", "venue_type"]);
    if (ok) setStep(1);
  }, [trigger]);

  const bodyStyle = { maxWidth: 960, margin: "0 auto", width: "100%" as const };

  return (
    <Create
      title={t("trainingPlans.create.pageTitle")}
      contentProps={{
        sx: { pt: 1, px: 1.5 },
      }}
      footerButtons={({ saveButtonProps: sp }) => (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {step === 1 ? (
            <Button variant="outlined" onClick={() => setStep(0)}>
              {t("trainingPlans.create.backToDetails")}
            </Button>
          ) : null}
          {step === 0 ? (
            <Button variant="contained" onClick={() => void goNext()}>
              {t("trainingPlans.create.continueToProgram")}
            </Button>
          ) : (
            <Button variant="contained" {...sp}>
              {t("trainingPlans.create.savePlan")}
            </Button>
          )}
        </Box>
      )}
    >
      <Box sx={bodyStyle}>
        <Stepper activeStep={step} orientation={isMdUp ? "horizontal" : "vertical"} sx={{ mb: 2.5 }}>
          <Step>
            <StepLabel>
              <Typography variant="subtitle2">{t("trainingPlans.create.stepBasicsTitle")}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("trainingPlans.create.stepBasicsDesc")}
              </Typography>
            </StepLabel>
          </Step>
          <Step>
            <StepLabel>
              <Typography variant="subtitle2">{t("trainingPlans.create.stepProgramTitle")}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t("trainingPlans.create.stepProgramDesc")}
              </Typography>
            </StepLabel>
          </Step>
        </Stepper>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {step === 0 ? t("trainingPlans.create.stepBasicsHint") : t("trainingPlans.create.stepProgramHint")}
        </Typography>
      </Box>

      <Box component="form" sx={bodyStyle}>
        <Box sx={{ display: step === 0 ? "block" : "none" }}>
          <TrainingPlanOverviewCard control={control} variant="create" />
        </Box>
        <Box sx={{ display: step === 1 ? "block" : "none" }}>
          <TrainingPlanWorkoutRichField control={control} />
        </Box>
      </Box>
      {step === 1 ? (
        <Box sx={bodyStyle}>
          <WorkoutItemsEditor
            mode="training-plan"
            planVenue={venueType}
            initialItems={workoutLines}
            showSaveButton={false}
            onChange={onWorkoutChange}
          />
        </Box>
      ) : null}
    </Create>
  );
}
