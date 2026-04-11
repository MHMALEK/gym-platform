import AddIcon from "@mui/icons-material/Add";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { type BaseSyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { dietMealsFromApi, normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";

type RecordShape = {
  id?: number;
  name?: string;
  description?: string | null;
  notes_plan?: string | null;
  meals?: unknown[];
};

type NutritionFormValues = {
  name: string;
  description?: string;
  notes_plan?: string;
};

export function NutritionTemplateEdit() {
  const { t } = useTranslation();
  const [assignOpen, setAssignOpen] = useState(false);
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const hydratedIdRef = useRef<number | null>(null);

  const { control, saveButtonProps, handleSubmit, refineCore } = useForm<NutritionFormValues>({
    refineCoreProps: { resource: "nutrition-templates" },
  });

  const query = refineCore.query;
  const record = query?.data?.data as RecordShape | undefined;

  useEffect(() => {
    if (!query?.isSuccess || record?.id == null) return;
    if (hydratedIdRef.current === record.id) return;
    hydratedIdRef.current = record.id;
    setDietMeals(dietMealsFromApi(record.meals ?? []));
  }, [query?.isSuccess, record?.id, record?.meals]);

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
    <Edit
      title={t("nutritionTemplates.edit.pageTitle")}
      saveButtonProps={mergedSave}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button
            variant="outlined"
            size="medium"
            startIcon={<GroupAddIcon />}
            disabled={record?.id == null}
            onClick={() => setAssignOpen(true)}
          >
            {t("assignPlanToClients.assignToClientsButton")}
          </Button>
          <Button component={Link} to="/nutrition-templates/create" variant="outlined" size="medium" startIcon={<AddIcon />}>
            {t("common.quickLinks.newNutritionTemplate")}
          </Button>
        </>
      )}
    >
      {query?.isLoading ? (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box component="form" sx={{ maxWidth: 880 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  label={t("nutritionTemplates.form.name")}
                  fullWidth
                  margin="normal"
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ""} label={t("nutritionTemplates.form.description")} fullWidth margin="normal" multiline minRows={2} />
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
                  fullWidth
                  margin="normal"
                  multiline
                  minRows={4}
                  inputProps={{ maxLength: 32000 }}
                />
              )}
            />
          </Box>
          <Stack sx={{ mt: 2, maxWidth: 880 }}>
            <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />
          </Stack>
        </>
      )}
      <AssignPlanToClientsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        mode="nutrition"
        resourceId={record?.id ?? 0}
        resourceName={record?.name}
      />
    </Edit>
  );
}
