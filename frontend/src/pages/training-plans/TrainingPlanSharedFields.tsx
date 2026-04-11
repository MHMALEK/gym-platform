import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
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

export function TrainingPlanOverviewCard({
  control,
  variant,
}: {
  control: Control<SharedForm>;
  variant: "create" | "edit";
}) {
  const { t } = useTranslation();
  const Icon = variant === "create" ? AddIcon : EditIcon;
  const venueOptions = [
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        bgcolor: "var(--app-surface-elevated, rgba(15, 23, 42, 0.45))",
        borderColor: "var(--app-border, rgba(148, 163, 184, 0.2))",
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ mt: 0, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
          <Icon fontSize="small" sx={{ opacity: 0.85 }} />
          {t("trainingPlans.form.planOverviewTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("trainingPlans.form.planOverviewHint")}
        </Typography>
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
              margin="normal"
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
              margin="normal"
              multiline
              minRows={3}
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
            <TextField {...field} value={field.value ?? "mixed"} fullWidth margin="normal" select label={t("trainingPlans.form.venue")} size="medium">
              {venueOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </CardContent>
    </Card>
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
          <WorkoutRichEditor placeholder={t("workouts.richPlaceholder")} value={field.value ?? ""} onChange={field.onChange} />
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
