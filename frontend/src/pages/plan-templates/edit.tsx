import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PlanTemplateFormFields, type PlanFormValues } from "./PlanTemplateFormFields";

export function PlanTemplateEdit() {
  const { t } = useTranslation();
  const { control, saveButtonProps } = useForm<PlanFormValues>({
    refineCoreProps: { resource: "plan-templates" },
  });

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button component={Link} to="/plan-templates/create" variant="outlined" size="medium" startIcon={<AddIcon />}>
            {t("common.quickLinks.newMembershipPlan")}
          </Button>
        </>
      )}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0, mb: 2.5, maxWidth: 720, lineHeight: 1.6 }}>
        {t("planTemplates.edit.hint")}
      </Typography>
      <Box component="form" noValidate autoComplete="off">
        <PlanTemplateFormFields control={control} />
      </Box>
    </Edit>
  );
}
