import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import { type Control, Controller } from "react-hook-form";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { RefineAsyncSelect, type RefineAsyncSelectBind } from "../../components/RefineAsyncSelect";
import { ClientPlansCta } from "./ClientPlansCta";

export type ClientFormValues = Record<string, unknown>;

type ClientFormSectionsProps = {
  control: Control<ClientFormValues>;
  goalTypeSelect: RefineAsyncSelectBind;
  planSelect: RefineAsyncSelectBind;
  isCreate: boolean;
  /** Create wizard: show only one step at a time (steps 0–2; step 3 is coaching plans in create.tsx). */
  createWizardStep?: 0 | 1 | 2;
  /** Edit flow: link to workout & diet plans for this client */
  coachingPlansClientId?: number;
};

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="client-form-section__head">
      <Typography variant="h6" component="h2" className="client-form-section__title" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="client-form-section__hint">
        {hint}
      </Typography>
    </header>
  );
}

export function ClientFormSections({
  control,
  goalTypeSelect,
  planSelect,
  isCreate,
  createWizardStep,
  coachingPlansClientId,
}: ClientFormSectionsProps) {
  const { t } = useTranslation();
  const wizard = createWizardStep !== undefined;
  const stepHidden = (s: 0 | 1 | 2) => Boolean(wizard && createWizardStep !== s);
  const unifiedLayout = !wizard;

  const statusOptions = useMemo(
    () =>
      (["active", "inactive", "archived"] as const).map((v) => ({
        value: v,
        label: t(`clients.roster.${v}`),
      })),
    [t],
  );

  const accountStatusOptions = useMemo(
    () =>
      (["good_standing", "payment_issue", "onboarding", "churned"] as const).map((v) => ({
        value: v,
        label: t(`clients.accountStatus.${v}`),
      })),
    [t],
  );

  const sectionCardClass = "client-section-card client-section-card--editable";

  const contactBlock = (
    <>
      <SectionHead title={t("clients.form.contactTitle")} hint={t("clients.form.contactHint")} />
      <Controller
        name="name"
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            label={t("clients.form.name")}
            placeholder={t("clients.form.namePh")}
            required
            fullWidth
            margin="normal"
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="email"
                label={t("clients.form.email")}
                placeholder={t("clients.form.emailPh")}
                fullWidth
                margin="normal"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                label={t("clients.form.phone")}
                placeholder={t("clients.form.phonePh")}
                fullWidth
                margin="normal"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
      </Grid>
    </>
  );

  const bodyBlock = (
    <>
      <SectionHead title={t("clients.form.bodyTitle")} hint={t("clients.form.bodyHint")} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="weight_kg"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                label={t("clients.form.weight")}
                placeholder={t("common.dash")}
                fullWidth
                margin="normal"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="height_cm"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                label={t("clients.form.height")}
                placeholder={t("common.dash")}
                fullWidth
                margin="normal"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
              />
            )}
          />
        </Grid>
      </Grid>
    </>
  );

  const goalsBlock = (
    <>
      <SectionHead title={t("clients.form.goalsTitle")} hint={t("clients.form.goalsHint")} />
      <Controller
        name="goal_type_id"
        control={control}
        render={({ field, fieldState }) => (
          <RefineAsyncSelect
            bind={goalTypeSelect}
            value={field.value}
            onChange={field.onChange}
            label={t("clients.form.primaryGoal")}
            placeholder={t("clients.form.goalCatalogPh")}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="goal"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            label={t("clients.form.goalDetails")}
            placeholder={t("clients.form.goalDetailsPh")}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            inputProps={{ maxLength: 500 }}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
    </>
  );

  const membershipBlock = (
    <>
      <SectionHead title={t("clients.form.membershipTitle")} hint={t("clients.form.membershipHint")} />
      <Controller
        name="subscription_plan_template_id"
        control={control}
        render={({ field, fieldState }) => (
          <RefineAsyncSelect
            bind={planSelect}
            value={field.value}
            onChange={field.onChange}
            label={t("clients.form.planTemplate")}
            placeholder={t("clients.form.planTemplatePh")}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
    </>
  );

  const accountBlock = (
    <>
      <SectionHead title={t("clients.form.accountTitle")} hint={t("clients.form.accountHint")} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="status"
            control={control}
            defaultValue={isCreate ? "active" : undefined}
            render={({ field, fieldState }) => (
              <FormControl fullWidth margin="normal" error={!!fieldState.error}>
                <InputLabel id="client-status-label">{t("clients.form.roster")}</InputLabel>
                <Select
                  {...field}
                  labelId="client-status-label"
                  label={t("clients.form.roster")}
                  value={field.value ?? ""}
                >
                  {statusOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="account_status"
            control={control}
            defaultValue={isCreate ? "good_standing" : undefined}
            render={({ field, fieldState }) => (
              <FormControl fullWidth margin="normal" error={!!fieldState.error}>
                <InputLabel id="client-account-status-label">{t("clients.form.clientStatus")}</InputLabel>
                <Select
                  {...field}
                  labelId="client-account-status-label"
                  label={t("clients.form.clientStatus")}
                  value={field.value ?? ""}
                >
                  {accountStatusOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
        </Grid>
      </Grid>
    </>
  );

  const notesBlock = (
    <>
      <SectionHead title={t("clients.form.notesTitle")} hint={t("clients.form.notesHint")} />
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            label={t("clients.form.notesLabel")}
            placeholder={t("clients.form.notesPh")}
            fullWidth
            margin="normal"
            multiline
            minRows={4}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
    </>
  );

  if (unifiedLayout) {
    return (
      <>
        <div className="client-form-unified">
          <Card variant="outlined" className="client-profile-editor-surface">
            <CardContent>
              <section className="client-form-section">{contactBlock}</section>
              <Divider className="client-form-section-divider" sx={{ my: 2 }} />
              <section className="client-form-section">{bodyBlock}</section>
              <Divider className="client-form-section-divider" sx={{ my: 2 }} />
              <section className="client-form-section">{goalsBlock}</section>
              <Divider className="client-form-section-divider" sx={{ my: 2 }} />
              <section className="client-form-section">{membershipBlock}</section>
              <Divider className="client-form-section-divider" sx={{ my: 2 }} />
              <section className="client-form-section">{accountBlock}</section>
              <Divider className="client-form-section-divider" sx={{ my: 2 }} />
              <section className="client-form-section">{notesBlock}</section>
            </CardContent>
          </Card>
        </div>
        {coachingPlansClientId != null ? <ClientPlansCta clientId={coachingPlansClientId} compact /> : null}
      </>
    );
  }

  return (
    <>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 840 }}>
        <div hidden={stepHidden(0)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.contactTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.contactHint")}
              </Typography>
              <Controller
                name="name"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label={t("clients.form.name")}
                    placeholder={t("clients.form.namePh")}
                    required
                    fullWidth
                    margin="dense"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        type="email"
                        label={t("clients.form.email")}
                        placeholder={t("clients.form.emailPh")}
                        fullWidth
                        margin="dense"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label={t("clients.form.phone")}
                        placeholder={t("clients.form.phonePh")}
                        fullWidth
                        margin="dense"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </div>

        <div hidden={stepHidden(1)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.bodyTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.bodyHint")}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="weight_kg"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        type="number"
                        inputProps={{ min: 0, step: 0.1 }}
                        label={t("clients.form.weight")}
                        placeholder={t("common.dash")}
                        fullWidth
                        margin="dense"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : Number(v));
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="height_cm"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        type="number"
                        inputProps={{ min: 0, step: 0.1 }}
                        label={t("clients.form.height")}
                        placeholder={t("common.dash")}
                        fullWidth
                        margin="dense"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : Number(v));
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </div>

        <div hidden={stepHidden(1)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.goalsTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.goalsHint")}
              </Typography>
              <Controller
                name="goal_type_id"
                control={control}
                render={({ field, fieldState }) => (
                  <RefineAsyncSelect
                    bind={goalTypeSelect}
                    value={field.value}
                    onChange={field.onChange}
                    label={t("clients.form.primaryGoal")}
                    placeholder={t("clients.form.goalCatalogPh")}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="goal"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label={t("clients.form.goalDetails")}
                    placeholder={t("clients.form.goalDetailsPh")}
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={3}
                    inputProps={{ maxLength: 500 }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div hidden={stepHidden(2)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.membershipTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.membershipHint")}
              </Typography>
              <Controller
                name="subscription_plan_template_id"
                control={control}
                render={({ field, fieldState }) => (
                  <RefineAsyncSelect
                    bind={planSelect}
                    value={field.value}
                    onChange={field.onChange}
                    label={t("clients.form.planTemplate")}
                    placeholder={t("clients.form.planTemplatePh")}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div hidden={stepHidden(2)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.accountTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.accountHint")}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="status"
                    control={control}
                    defaultValue={isCreate ? "active" : undefined}
                    render={({ field, fieldState }) => (
                      <FormControl fullWidth margin="dense" error={!!fieldState.error}>
                        <InputLabel id="wiz-client-status-label">{t("clients.form.roster")}</InputLabel>
                        <Select
                          {...field}
                          labelId="wiz-client-status-label"
                          label={t("clients.form.roster")}
                          value={field.value ?? ""}
                        >
                          {statusOptions.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="account_status"
                    control={control}
                    defaultValue={isCreate ? "good_standing" : undefined}
                    render={({ field, fieldState }) => (
                      <FormControl fullWidth margin="dense" error={!!fieldState.error}>
                        <InputLabel id="wiz-account-status-label">{t("clients.form.clientStatus")}</InputLabel>
                        <Select
                          {...field}
                          labelId="wiz-account-status-label"
                          label={t("clients.form.clientStatus")}
                          value={field.value ?? ""}
                        >
                          {accountStatusOptions.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </div>

        <div hidden={stepHidden(2)}>
          <Card variant="outlined" className={sectionCardClass}>
            <CardHeader title={t("clients.form.notesTitle")} />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clients.form.notesHint")}
              </Typography>
              <Controller
                name="notes"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label={t("clients.form.notesLabel")}
                    placeholder={t("clients.form.notesPh")}
                    fullWidth
                    margin="dense"
                    multiline
                    minRows={4}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </CardContent>
          </Card>
        </div>
      </Stack>
    </>
  );
}
