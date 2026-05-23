import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Link from "@mui/material/Link";
import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { useCoachBranding } from "../../contexts/CoachBrandingContext";
import { apiPrefix, authHeaders } from "../../lib/api";
import { apiDemoReset, apiDemoSeed } from "../../lib/demoApi";
import { patchCoachProfile } from "../../lib/coachProfileApi";
import { mediaSrc, uploadMediaFile } from "../../lib/exerciseMediaApi";
import { useAppMessage } from "../../lib/useAppMessage";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

type BrandForm = {
  name: string;
  tagline: string;
  primary_color: string;
};

export function BrandingSettingsPage() {
  const { t } = useTranslation();
  const { branding, refresh } = useCoachBranding();
  const message = useAppMessage();
  const { register, handleSubmit, reset, watch, setValue } = useForm<BrandForm>({
    defaultValues: { name: "", tagline: "", primary_color: "" },
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState<"seed" | "reset" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryColor = watch("primary_color");

  useEffect(() => {
    if (branding.loading) return;
    reset({
      name: branding.name,
      tagline: branding.tagline ?? "",
      primary_color: branding.primaryColor?.replace(/^#/, "") ? branding.primaryColor ?? "" : "",
    });
  }, [branding, reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiPrefix}/me`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = (await res.json()) as { invite_code?: string | null };
        if (!cancelled) setInviteCode(data.invite_code ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branding.loading]);

  const onSubmit = async (values: BrandForm) => {
    setSaving(true);
    try {
      const tag = values.tagline?.trim() ?? "";
      let hex = values.primary_color?.trim() ?? "";
      if (hex && !hex.startsWith("#")) hex = `#${hex}`;
      await patchCoachProfile({
        name: values.name.trim(),
        tagline: tag.length ? tag : null,
        primary_color: hex && hex.length > 1 ? hex : null,
      });
      await refresh();
      message.success(t("branding.saved"));
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
      message.error(msg || t("branding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    try {
      await patchCoachProfile({ logo_media_asset_id: null });
      await refresh();
      message.success(t("branding.logoRemoved"));
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
      message.error(msg || t("branding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadMediaFile(file);
      await patchCoachProfile({ logo_media_asset_id: asset.id });
      await refresh();
      message.success(t("branding.logoUpdated"));
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
      message.error(msg || t("branding.uploadFailed"));
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  if (branding.loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const colorValue = primaryColor?.startsWith("#") ? primaryColor : primaryColor ? `#${primaryColor}` : "#22c55e";

  const onDemoSeed = async () => {
    setDemoBusy("seed");
    try {
      const summary = await apiDemoSeed();
      message.success(
        t("demo.seedSuccess", {
          clients: summary.clients,
          invoices: summary.invoices,
        }),
      );
      const res = await fetch(`${apiPrefix}/me`, { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { invite_code?: string | null };
        setInviteCode(data.invite_code ?? null);
      }
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDemoBusy(null);
    }
  };

  const onDemoReset = async () => {
    setDemoBusy("reset");
    try {
      await apiDemoReset();
      message.success(t("demo.resetSuccess"));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 2, px: 3, pb: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 1 }}>
            {t("branding.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("branding.subtitle")}
          </Typography>
        </Box>
        <Link component={RouterLink} to="/settings/integrations" variant="body2" sx={{ flexShrink: 0, pt: 0.5 }}>
          {t("nav.integrations")} →
        </Link>
      </Stack>

      {devAuth ? (
        <Card variant="outlined" sx={{ mb: 3, bgcolor: "action.hover" }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {t("demo.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("demo.subtitle")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <LoadingButton
                variant="contained"
                loading={demoBusy === "seed"}
                disabled={demoBusy !== null}
                onClick={() => void onDemoSeed()}
              >
                {t("demo.loadDemo")}
              </LoadingButton>
              <Button
                variant="outlined"
                color="inherit"
                disabled={demoBusy !== null}
                onClick={() => void onDemoReset()}
              >
                {demoBusy === "reset" ? t("demo.resetting") : t("demo.resetDemo")}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {inviteCode ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {t("branding.inviteTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("branding.inviteSubtitle")}
            </Typography>
            <TextField
              label={t("branding.inviteCode")}
              value={inviteCode}
              fullWidth
              margin="dense"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label={t("branding.inviteLink")}
              value={`${window.location.origin}/client/register?invite=${inviteCode}`}
              fullWidth
              margin="dense"
              InputProps={{ readOnly: true }}
            />
            <Button
              sx={{ mt: 1 }}
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${window.location.origin}/client/register?invite=${inviteCode}`,
                );
                message.success(t("branding.inviteCopied"));
              }}
            >
              {t("branding.inviteLink")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register("name", { required: t("branding.nameRequired") })}
              label={t("branding.displayName")}
              fullWidth
              margin="normal"
              required
              inputProps={{ maxLength: 255 }}
            />
            <TextField
              {...register("tagline")}
              label={t("branding.tagline")}
              fullWidth
              margin="normal"
              placeholder={t("branding.taglinePh")}
              inputProps={{ maxLength: 500 }}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>
                {t("branding.accentColor")}
              </Typography>
              <Box
                component="input"
                type="color"
                value={colorValue}
                onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                sx={{ width: 48, height: 40, border: "none", p: 0, cursor: "pointer", bgcolor: "transparent" }}
              />
              <TextField
                size="small"
                label="Hex"
                value={primaryColor ?? ""}
                onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                placeholder="#22c55e"
                sx={{ maxWidth: 140 }}
              />
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              {t("branding.logo")}
            </Typography>
            <Stack spacing={2} sx={{ width: "100%" }}>
              {branding.logoUrl ? (
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    component="img"
                    src={mediaSrc(branding.logoUrl)}
                    alt=""
                    sx={{
                      width: 96,
                      height: 96,
                      objectFit: "contain",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      p: 1,
                      bgcolor: "background.paper",
                    }}
                  />
                  <Button color="error" onClick={() => void removeLogo()} disabled={saving || uploading}>
                    {t("branding.removeLogo")}
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("branding.noLogo")}
                </Typography>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => void onFileChange(e)} />
              <LoadingButton variant="outlined" startIcon={<UploadFileIcon />} loading={uploading} disabled={saving} onClick={onPickFile}>
                {t("branding.uploadLogo")}
              </LoadingButton>
            </Stack>

            <LoadingButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving} sx={{ mt: 3 }}>
              {t("actions.save")}
            </LoadingButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
