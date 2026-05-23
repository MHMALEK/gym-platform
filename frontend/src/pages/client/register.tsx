import LoadingButton from "@mui/lab/LoadingButton";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRegister } from "@refinedev/core";
import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiCoachPreview, type CoachPublicPreview } from "../../lib/authApi";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function ClientRegisterPage() {
  const { mutate: register, isLoading } = useRegister();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initialInvite = params.get("invite") ?? "";
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [coachPreview, setCoachPreview] = useState<CoachPublicPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const code = inviteCode.trim();
    if (!code) {
      setCoachPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    apiCoachPreview(code)
      .then((p) => {
        if (!cancelled) setCoachPreview(p);
      })
      .catch(() => {
        if (!cancelled) {
          setCoachPreview(null);
          setPreviewError(t("clientAuth.invalidInvite"));
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, t]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card sx={{ width: "min(420px, 100%)", borderRadius: 3, boxShadow: "none" }}>
        <CardHeader title={t("clientAuth.registerTitle")} subheader={t("clientAuth.registerSubtitle")} />
        <CardContent>
          <TextField
            label={t("clientAuth.inviteCode")}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            fullWidth
            margin="normal"
            helperText={t("clientAuth.inviteHint")}
          />
          {previewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress size={22} />
            </Box>
          ) : null}
          {previewError ? <Alert severity="error">{previewError}</Alert> : null}
          {coachPreview ? (
            <Alert severity="success">
              {t("clientAuth.joiningCoach", { name: coachPreview.name })}
              {coachPreview.tagline ? ` — ${coachPreview.tagline}` : ""}
            </Alert>
          ) : null}

          {devAuth ? (
            <LoadingButton
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              loading={isLoading}
              disabled={!inviteCode.trim()}
              onClick={() => register({ invite_code: inviteCode.trim() })}
            >
              {t("clientAuth.devRegister")}
            </LoadingButton>
          ) : (
            <Box
              component="form"
              sx={{ mt: 1 }}
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                register({
                  name: String(fd.get("name") ?? ""),
                  email: String(fd.get("email") ?? ""),
                  password: String(fd.get("password") ?? ""),
                  invite_code: inviteCode.trim(),
                });
              }}
            >
              <TextField name="name" label={t("register.name")} required fullWidth margin="normal" />
              <TextField
                name="email"
                label={t("login.email")}
                type="email"
                required
                fullWidth
                margin="normal"
                autoComplete="email"
              />
              <TextField
                name="password"
                label={t("login.password")}
                type="password"
                required
                fullWidth
                margin="normal"
                autoComplete="new-password"
              />
              <LoadingButton
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                loading={isLoading}
                disabled={!inviteCode.trim() || Boolean(previewError)}
              >
                {t("register.signUp")}
              </LoadingButton>
            </Box>
          )}

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            {t("clientAuth.haveAccount")}{" "}
            <Link
              component={RouterLink}
              to={`/client/login${inviteCode.trim() ? `?invite=${encodeURIComponent(inviteCode.trim())}` : ""}`}
            >
              {t("login.signIn")}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
