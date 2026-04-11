import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ExerciseFormMediaUpload } from "../../components/ExerciseFormMediaUpload";

const PLAN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type PlanFormValues = Record<string, unknown>;

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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0, mb: 2 }}>
        {t("planTemplates.edit.hint")}
      </Typography>
      <Box component="form" sx={{ maxWidth: 720 }}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label={t("planTemplates.create.name")}
              fullWidth
              margin="normal"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("planTemplates.create.code")} fullWidth margin="normal" />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("planTemplates.create.description")} fullWidth margin="normal" multiline minRows={2} />
          )}
        />
        <Controller
          name="image_url"
          control={control}
          render={({ field }) => (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("planTemplates.create.imageUrl")}
              </Typography>
              <ExerciseFormMediaUpload
                variant="thumbnail"
                accept={PLAN_IMAGE_ACCEPT}
                emptyHint={t("planTemplates.create.imageEmpty")}
                value={field.value as string | null}
                onChange={field.onChange}
              />
            </Box>
          )}
        />
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              name="duration_days"
              control={control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <TextField
                  label={t("planTemplates.create.duration")}
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  value={field.value === undefined || field.value === null ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ""} label={t("planTemplates.create.currency")} fullWidth inputProps={{ maxLength: 8 }} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              name="sort_order"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("planTemplates.create.sortOrder")}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                  value={field.value === undefined || field.value === null ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              )}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("planTemplates.create.price")}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  value={field.value === undefined || field.value === null ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="discount_price"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("planTemplates.create.discount")}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  value={field.value === undefined || field.value === null ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
              )}
            />
          </Grid>
        </Grid>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              sx={{ mt: 2 }}
              control={<Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />}
              label={t("planTemplates.create.active")}
            />
          )}
        />
      </Box>
    </Edit>
  );
}
