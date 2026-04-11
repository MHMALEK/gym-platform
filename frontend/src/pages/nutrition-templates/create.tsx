import AddIcon from "@mui/icons-material/Add";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Create } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { type BaseSyntheticEvent, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";

type NutritionFormValues = {
  name: string;
  description?: string;
  notes_plan?: string;
};

export function NutritionTemplateCreate() {
  const { t } = useTranslation();
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const { control, saveButtonProps, handleSubmit, refineCore } = useForm<NutritionFormValues>({
    refineCoreProps: { resource: "nutrition-templates" },
    defaultValues: { name: "", description: "", notes_plan: "" },
  });

  const mergedSave = useMemo(
    () => ({
      ...saveButtonProps,
      onClick: (e: BaseSyntheticEvent) => {
        e.preventDefault();
        handleSubmit((values) =>
          void refineCore.onFinish({
            ...values,
            meals: normalizeDietMealsForApi(dietMeals),
          }),
        )();
      },
    }),
    [saveButtonProps, handleSubmit, refineCore, dietMeals],
  );

  return (
    <Create
      title={t("nutritionTemplates.create.pageTitle")}
      saveButtonProps={mergedSave}
      contentProps={{ sx: { pt: 1, px: 1.5 } }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 880, mx: "auto" }}>
        <Typography variant="body2" color="text.secondary">
          {t("nutritionTemplates.create.hint")}{" "}
          <Link to="/library/nutrition-templates">{t("nutritionTemplates.list.openCatalog")}</Link>
        </Typography>
        <Card variant="outlined">
          <CardHeader
            avatar={<AddIcon color="action" />}
            title={t("nutritionTemplates.create.sectionDetails")}
            subheader={t("nutritionTemplates.create.sectionDetailsHint")}
          />
          <CardContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  label={t("nutritionTemplates.form.name")}
                  placeholder={t("nutritionTemplates.form.namePlaceholder")}
                  fullWidth
                  required
                  margin="normal"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  label={t("nutritionTemplates.form.description")}
                  placeholder={t("nutritionTemplates.form.descriptionPlaceholder")}
                  fullWidth
                  margin="normal"
                  multiline
                  minRows={2}
                />
              )}
            />
            <Controller
              name="notes_plan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  label={t("nutritionTemplates.form.notesPlan")}
                  placeholder={t("nutritionTemplates.form.notesPlanPlaceholder")}
                  fullWidth
                  margin="normal"
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 32000 }}
                />
              )}
            />
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader title={t("nutritionTemplates.create.sectionMeals")} subheader={t("nutritionTemplates.create.sectionMealsHint")} />
          <CardContent>
            <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />
          </CardContent>
        </Card>
      </Stack>
    </Create>
  );
}
