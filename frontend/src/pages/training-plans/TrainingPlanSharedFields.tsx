import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type ReactNode } from "react";
import { type Control, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { WorkoutRichEditor } from "../../components/WorkoutRichEditor";

type SharedForm = {
  name?: string;
  description?: string;
  venue_type?: string;
  workout_rich_html?: string;
};

/**
 * Plan basics — flat layout, no card chrome. Sits on a page that already
 * provides title and section context, so we keep the visual weight low.
 */
export function TrainingPlanOverviewCard({
  control,
}: {
  control: Control<SharedForm>;
  /** Kept for backwards compatibility; the icon/title is now provided by the page header. */
  variant?: "create" | "edit";
}) {
  const { t } = useTranslation();
  const venueOptions = [
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Stack spacing={2.25} sx={{ width: "100%" }}>
      <Controller
        name="name"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            required
            fullWidth
            size="medium"
            label={t("trainingPlans.list.name")}
            placeholder={t("trainingPlans.form.namePlaceholder")}
            inputProps={{ maxLength: 160 }}
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
            fullWidth
            multiline
            minRows={2}
            label={t("trainingPlans.list.description")}
            placeholder={t("trainingPlans.form.descriptionPlaceholder")}
            inputProps={{ maxLength: 2000 }}
          />
        )}
      />
      <Controller
        name="venue_type"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value ?? "mixed"}
            fullWidth
            select
            label={t("trainingPlans.form.venue")}
            sx={{ maxWidth: 320 }}
          >
            {venueOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}

export function TrainingPlanWorkoutRichField({ control }: { control: Control<SharedForm> }) {
  const { t } = useTranslation();
  return (
    <Controller
      name="workout_rich_html"
      control={control}
      render={({ field }) => (
        <BoxField label={t("workouts.richSectionTitle")}>
          <WorkoutRichEditor
            placeholder={t("workouts.richPlaceholder")}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        </BoxField>
      )}
    />
  );
}

function BoxField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      {children}
    </div>
  );
}
