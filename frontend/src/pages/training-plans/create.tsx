import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useInvalidate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CoachingPlanPreview } from "../../components/CoachingPlanPreview";
import { PageHeader } from "../../components/layout/PageHeader";
import { StickyActionBar } from "../../components/layout/StickyActionBar";
import { TrainingPlanAiAssistant } from "../../components/TrainingPlanAiAssistant";
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

const PAGE_MAX_WIDTH = "100%";

export function TrainingPlanCreate() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [step, setStep] = useState<0 | 1>(0);
  const [workoutLines, setWorkoutLines] = useState<WorkoutLine[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { control, saveButtonProps, trigger, watch, setValue } = useForm<FormValues>({
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
  const watchedValues = watch();

  const onWorkoutChange = useCallback((next: WorkoutLine[]) => {
    setWorkoutLines(next);
  }, []);

  const goNext = useCallback(async () => {
    const ok = await trigger(["name", "venue_type"]);
    if (ok) setStep(1);
  }, [trigger]);

  const cancelLabel = t("common.cancel") !== "common.cancel" ? t("common.cancel") : "Cancel";

  return (
    <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
      <PageHeader
        title={t("trainingPlans.create.pageTitle")}
        subtitle={
          step === 0
            ? t("trainingPlans.create.stepBasicsHint")
            : t("trainingPlans.create.stepProgramHint")
        }
      />

      <Tabs
        value={step}
        onChange={(_, v) => {
          if (v === 0) setStep(0);
          else void goNext();
        }}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
          minHeight: 40,
          "& .MuiTab-root": {
            minHeight: 40,
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            px: 1.5,
          },
        }}
      >
        <Tab label={t("trainingPlans.create.stepBasicsTitle")} />
        <Tab label={t("trainingPlans.create.stepProgramTitle")} />
      </Tabs>

      <Box component="form" sx={{ display: step === 0 ? "block" : "none" }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanOverviewCard control={control} variant="create" />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: step === 1 ? "block" : "none" }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanWorkoutRichField control={control} />
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <TrainingPlanAiAssistant
                venueType={venueType}
                onApplyWorkoutLines={setWorkoutLines}
                onApplyPlanMeta={({ planName, planDescription }) => {
                  const nameNow = watch("name");
                  if (!String(nameNow ?? "").trim()) {
                    setValue("name", planName, { shouldDirty: true });
                  }
                  const descNow = watch("description");
                  if (planDescription && !String(descNow ?? "").trim()) {
                    setValue("description", planDescription, { shouldDirty: true });
                  }
                }}
              />
            </Box>
            <WorkoutItemsEditor
              mode="training-plan"
              planVenue={venueType}
              initialItems={workoutLines}
              showSaveButton={false}
              hideHeader
              onChange={onWorkoutChange}
            />
          </CardContent>
        </Card>
      </Box>

      <StickyActionBar>
        <Button
          variant="text"
          color="inherit"
          onClick={() => navigate("/training-plans")}
          sx={{ color: "text.secondary", textTransform: "none", fontWeight: 500 }}
        >
          {cancelLabel}
        </Button>
        {step === 0 ? (
          <Button
            variant="contained"
            onClick={() => void goNext()}
            sx={{ borderRadius: 1.5, fontWeight: 500, textTransform: "none", px: 2.5 }}
          >
            {t("trainingPlans.create.continueToProgram")}
          </Button>
        ) : (
          <>
            <Button
              variant="text"
              color="inherit"
              onClick={() => setStep(0)}
              sx={{ color: "text.secondary", textTransform: "none", fontWeight: 500 }}
            >
              {t("trainingPlans.create.backToDetails")}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPreviewOpen(true)}
              sx={{ borderRadius: 1.5, fontWeight: 500, textTransform: "none", px: 2 }}
            >
              {t("trainingPlans.shared.preview")}
            </Button>
            <Button
              variant="contained"
              {...saveButtonProps}
              sx={{ borderRadius: 1.5, fontWeight: 500, textTransform: "none", px: 2.5 }}
            >
              {t("trainingPlans.create.savePlan")}
            </Button>
          </>
        )}
      </StickyActionBar>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{t("trainingPlans.shared.workoutPreviewModalTitle")}</DialogTitle>
        <DialogContent dividers>
          <CoachingPlanPreview
            title={watchedValues.name || t("trainingPlans.create.pageTitle")}
            eyebrow={t("trainingPlans.shared.planPreviewEyebrow")}
            programVenue={venueType}
            workoutRichHtml={watchedValues.workout_rich_html}
            workoutNotes={watchedValues.description}
            workoutLines={workoutLines}
            dietMeals={[]}
            showDiet={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>{t("trainingPlans.shared.closePreview")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
