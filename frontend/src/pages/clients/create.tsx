import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Create } from "@refinedev/mui";
import { useCreate, useSelect } from "@refinedev/core";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAppMessage } from "../../lib/useAppMessage";
import { ClientCreateCoachingPlansStep } from "./ClientCreateCoachingPlansStep";
import { ClientFormSections, type ClientFormValues } from "./formSections";

const WIZARD_FIELD_GROUPS = [
  ["name", "email", "phone"],
  ["weight_kg", "height_cm", "goal_type_id", "goal"],
  ["subscription_plan_template_id", "status", "account_status", "notes"],
] as const;

function toClientPayload(v: ClientFormValues) {
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
  const message = useAppMessage();
  const navigate = useNavigate();
  const isMdUp = useMediaQuery("(min-width:900px)");
  const [step, setStep] = useState(0);

  const { control, trigger, getValues } = useForm<ClientFormValues>({
    defaultValues: {
      status: "active",
      account_status: "good_standing",
    },
  });

  const { mutateAsync: createClient, isPending } = useCreate({
    successNotification: false,
  });

  const goalTypeSelect = useSelect({
    resource: "directory-goal-types",
    optionLabel: "label",
    optionValue: "id",
    pagination: { current: 1, pageSize: 100, mode: "server" },
  });

  const planSelect = useSelect({
    resource: "plan-templates",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  const handleNext = useCallback(async () => {
    if (step >= WIZARD_FIELD_GROUPS.length) return;
    const ok = await trigger([...WIZARD_FIELD_GROUPS[step]]);
    if (!ok) return;
    setStep((s) => s + 1);
  }, [step, trigger]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const finish = useCallback(async () => {
    const ok = await trigger();
    if (!ok) return;
    const v = getValues();
    const payload = toClientPayload(v);
    try {
      const res = await createClient({ resource: "clients", values: payload });
      const id = (res.data as { id?: number })?.id;
      if (id == null) {
        message.error(t("clients.wizard.createFailed"));
        return;
      }

      message.success(t("clients.wizard.created"));
      navigate(`/clients/edit/${id}`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : t("clients.wizard.createFailed");
      message.error(msg);
    }
  }, [createClient, getValues, message, navigate, t, trigger]);

  return (
    <Create
      isLoading={isPending}
      contentProps={{ sx: { pt: 1, px: 1.5 } }}
      footerButtons={() => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {step > 0 ? (
            <Button onClick={handleBack} disabled={isPending}>
              {t("clients.wizard.back")}
            </Button>
          ) : null}
          {step < WIZARD_FIELD_GROUPS.length ? (
            <Button variant="contained" onClick={() => void handleNext()} disabled={isPending}>
              {t("clients.wizard.next")}
            </Button>
          ) : (
            <>
              <Button onClick={() => void finish()} disabled={isPending}>
                {t("clients.wizard.skipPlans")}
              </Button>
              <Button variant="contained" onClick={() => void finish()} disabled={isPending}>
                {t("clients.wizard.saveClient")}
              </Button>
            </>
          )}
        </Stack>
      )}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 840, mx: "auto" }}>
        <Stepper activeStep={step} orientation={isMdUp ? "horizontal" : "vertical"} alternativeLabel={isMdUp}>
          <Step>
            <StepLabel>{t("clients.wizard.stepContact")}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t("clients.wizard.stepBodyGoals")}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t("clients.wizard.stepPlanAccount")}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t("clients.wizard.stepWorkoutDiet")}</StepLabel>
          </Step>
        </Stepper>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14, lineHeight: 1.55, m: 0 }}>
          {t(`clients.wizard.${STEP_HINT_KEYS[step]}`)}
        </Typography>
        <Box component="form" onSubmit={(e) => e.preventDefault()}>
          {step < 3 ? (
            <ClientFormSections
              control={control}
              goalTypeSelect={goalTypeSelect}
              planSelect={planSelect}
              isCreate
              createWizardStep={step as 0 | 1 | 2}
            />
          ) : (
            <ClientCreateCoachingPlansStep />
          )}
        </Box>
      </Stack>
    </Create>
  );
}
