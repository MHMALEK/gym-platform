import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Create } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { useTranslation } from "react-i18next";

import { PlanTemplateFormFields, type PlanFormValues } from "./PlanTemplateFormFields";

export function PlanTemplateCreate() {
  const { t } = useTranslation();
  const { control, saveButtonProps } = useForm<PlanFormValues>({
    refineCoreProps: { resource: "plan-templates" },
    defaultValues: {
      currency: "USD",
      sort_order: 0,
      is_active: true,
      duration_days: undefined as unknown as number,
    },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0, mb: 2.5, maxWidth: 720, lineHeight: 1.6 }}>
        {t("planTemplates.create.hint")}
      </Typography>
      <Box component="form" noValidate autoComplete="off">
        <PlanTemplateFormFields control={control} />
      </Box>
    </Create>
  );
}
