import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LoadingButton from "@mui/lab/LoadingButton";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { PageHeader } from "../../components/layout/PageHeader";
import {
  fetchMyCoachSite,
  patchMyCoachSite,
  type CoachSiteContent,
} from "../../lib/coachSiteApi";
import { useAppMessage } from "../../lib/useAppMessage";

export function CoachSiteSettingsPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState<CoachSiteContent | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMyCoachSite()
      .then((data) => {
        if (cancelled) return;
        setSlug(data.public_slug ?? "");
        setPublished(data.site_published);
        setContent(data.content);
        setPreviewPath(data.preview_path);
      })
      .catch((e: unknown) => {
        message.error(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [message]);

  const updateContent = (patch: Partial<CoachSiteContent>) => {
    setContent((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const data = await patchMyCoachSite({
        public_slug: slug.trim() || null,
        site_published: published,
        content,
      });
      setSlug(data.public_slug ?? "");
      setPublished(data.site_published);
      setContent(data.content);
      setPreviewPath(data.preview_path);
      message.success(t("coachSite.saved"));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !content) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", width: "100%" }}>
      <PageHeader title={t("coachSite.title")} subtitle={t("coachSite.subtitle")} />

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        {t("coachSite.hint")}
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700}>
              {t("coachSite.publishSection")}
            </Typography>
            <TextField
              label={t("coachSite.slugLabel")}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              helperText={t("coachSite.slugHelp")}
              size="small"
              fullWidth
            />
            <FormControlLabel
              control={<Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />}
              label={t("coachSite.publishedLabel")}
            />
            {previewPath ? (
              <Button
                component={RouterLink}
                to={previewPath}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewIcon />}
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
              >
                {t("coachSite.preview")}
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {t("coachSite.heroSection")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t("coachSite.heroHeadline")}
              value={content.hero.headline}
              onChange={(e) => updateContent({ hero: { ...content.hero, headline: e.target.value } })}
              fullWidth
              size="small"
            />
            <TextField
              label={t("coachSite.heroSubheadline")}
              value={content.hero.subheadline}
              onChange={(e) => updateContent({ hero: { ...content.hero, subheadline: e.target.value } })}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
            <TextField
              label={t("coachSite.heroCta")}
              value={content.hero.cta_label}
              onChange={(e) => updateContent({ hero: { ...content.hero, cta_label: e.target.value } })}
              fullWidth
              size="small"
            />
            <TextField
              label={t("coachSite.heroImage")}
              value={content.hero.hero_image_url ?? ""}
              onChange={(e) =>
                updateContent({ hero: { ...content.hero, hero_image_url: e.target.value.trim() || null } })
              }
              fullWidth
              size="small"
              placeholder="https://… or /uploads/…"
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {t("coachSite.aboutSection")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t("coachSite.aboutTitle")}
              value={content.about.title}
              onChange={(e) => updateContent({ about: { ...content.about, title: e.target.value } })}
              fullWidth
              size="small"
            />
            <TextField
              label={t("coachSite.aboutBody")}
              value={content.about.body}
              onChange={(e) => updateContent({ about: { ...content.about, body: e.target.value } })}
              fullWidth
              multiline
              minRows={4}
              size="small"
            />
            <TextField
              label={t("coachSite.aboutImage")}
              value={content.about.image_url ?? ""}
              onChange={(e) =>
                updateContent({ about: { ...content.about, image_url: e.target.value.trim() || null } })
              }
              fullWidth
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {t("coachSite.servicesSection")}
          </Typography>
          <Stack spacing={2}>
            {content.services.map((s, i) => (
              <Stack key={i} spacing={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                <TextField
                  label={t("coachSite.serviceTitle")}
                  value={s.title}
                  onChange={(e) => {
                    const services = [...content.services];
                    services[i] = { ...services[i], title: e.target.value };
                    updateContent({ services });
                  }}
                  size="small"
                  fullWidth
                />
                <TextField
                  label={t("coachSite.serviceDesc")}
                  value={s.description}
                  onChange={(e) => {
                    const services = [...content.services];
                    services[i] = { ...services[i], description: e.target.value };
                    updateContent({ services });
                  }}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {t("coachSite.contactSection")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t("coachSite.contactEmail")}
              value={content.contact.email}
              onChange={(e) => updateContent({ contact: { ...content.contact, email: e.target.value } })}
              size="small"
              fullWidth
            />
            <TextField
              label={t("coachSite.contactPhone")}
              value={content.contact.phone}
              onChange={(e) => updateContent({ contact: { ...content.contact, phone: e.target.value } })}
              size="small"
              fullWidth
            />
            <TextField
              label={t("coachSite.contactInstagram")}
              value={content.contact.instagram}
              onChange={(e) => updateContent({ contact: { ...content.contact, instagram: e.target.value } })}
              size="small"
              fullWidth
            />
            <TextField
              label={t("coachSite.contactWhatsapp")}
              value={content.contact.whatsapp}
              onChange={(e) => updateContent({ contact: { ...content.contact, whatsapp: e.target.value } })}
              size="small"
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      <LoadingButton variant="contained" loading={saving} onClick={() => void save()} sx={{ textTransform: "none" }}>
        {t("coachSite.save")}
      </LoadingButton>
    </Box>
  );
}
