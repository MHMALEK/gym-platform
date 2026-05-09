import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme, type Theme } from "@mui/material/styles";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ExerciseFormMediaUpload } from "../../components/ExerciseFormMediaUpload";

export const PLAN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export type PlanFormValues = Record<string, unknown>;

/** Tames Chrome autofill so fields match other outlined inputs in dark mode. */
function textFieldAutofillSx(theme: Theme) {
  const fill = theme.palette.background.paper;
  return {
    "& .MuiOutlinedInput-root": {
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
        WebkitBoxShadow: `0 0 0 1000px ${fill} inset`,
        WebkitTextFillColor: `${theme.palette.text.primary}`,
        caretColor: theme.palette.text.primary,
      },
    },
  } as const;
}

type Props = {
  control: Control<PlanFormValues>;
};

export function PlanTemplateFormFields({ control }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const autofillSx = textFieldAutofillSx(theme);

  const tfProps = {
    variant: "outlined" as const,
    margin: "none" as const,
    fullWidth: true,
    sx: autofillSx,
  };

  return (
    <Paper
      variant="outlined"
      component="div"
      sx={{
        maxWidth: 720,
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: (th) => (th.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : th.palette.background.paper),
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, letterSpacing: "0.02em" }}>
            {t("planTemplates.create.sectionBasics")}
          </Typography>
          <Stack spacing={2}>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  {...tfProps}
                  value={field.value ?? ""}
                  label={t("planTemplates.create.name")}
                  placeholder={t("planTemplates.create.namePh")}
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  autoComplete="off"
                />
              )}
            />
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  {...tfProps}
                  value={field.value ?? ""}
                  label={t("planTemplates.create.code")}
                  placeholder={t("planTemplates.create.codePh")}
                  helperText={t("planTemplates.create.codeTooltip")}
                  autoComplete="off"
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  {...tfProps}
                  value={field.value ?? ""}
                  label={t("planTemplates.create.description")}
                  multiline
                  minRows={3}
                  placeholder={t("planTemplates.create.descPh")}
                />
              )}
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600, letterSpacing: "0.02em" }}>
            {t("planTemplates.create.imageUrl")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 560, lineHeight: 1.55 }}>
            {t("planTemplates.create.imageTooltip")}
          </Typography>
          <Controller
            name="image_url"
            control={control}
            render={({ field }) => (
              <ExerciseFormMediaUpload
                variant="thumbnail"
                accept={PLAN_IMAGE_ACCEPT}
                emptyHint={t("planTemplates.create.imageEmpty")}
                value={field.value as string | null}
                onChange={field.onChange}
              />
            )}
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600, letterSpacing: "0.02em" }}>
            {t("planTemplates.create.sectionPricing")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="duration_days"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...tfProps}
                    label={t("planTemplates.create.duration")}
                    type="number"
                    required
                    placeholder="30"
                    inputProps={{ min: 1 }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    value={field.value === undefined || field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    {...tfProps}
                    value={field.value ?? "USD"}
                    label={t("planTemplates.create.currency")}
                    inputProps={{ maxLength: 8 }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="sort_order"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...tfProps}
                    label={t("planTemplates.create.sortOrder")}
                    type="number"
                    inputProps={{ min: 0 }}
                    value={field.value === undefined || field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...tfProps}
                    label={t("planTemplates.create.price")}
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    placeholder="0.00"
                    value={field.value === undefined || field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="discount_price"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...tfProps}
                    label={t("planTemplates.create.discount")}
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    placeholder={t("planTemplates.create.discountPh")}
                    value={field.value === undefined || field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600, letterSpacing: "0.02em" }}>
            {t("planTemplates.create.sectionStatus")}
          </Typography>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} color="primary" />}
                label={t("planTemplates.create.active")}
              />
            )}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
