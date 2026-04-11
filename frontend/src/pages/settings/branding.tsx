import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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

import { useCoachBranding } from "../../contexts/CoachBrandingContext";
import { patchCoachProfile } from "../../lib/coachProfileApi";
import { mediaSrc, uploadMediaFile } from "../../lib/exerciseMediaApi";
import { useAppMessage } from "../../lib/useAppMessage";

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

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 2, px: 3, pb: 6 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {t("branding.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t("branding.subtitle")}
      </Typography>

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
