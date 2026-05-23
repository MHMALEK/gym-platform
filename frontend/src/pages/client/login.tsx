import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLogin } from "@refinedev/core";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function ClientLoginPage() {
  const { mutate: login, isLoading } = useLogin();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const inviteFromUrl = params.get("invite") ?? "";

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
        <CardHeader title={t("clientAuth.loginTitle")} subheader={t("clientAuth.loginSubtitle")} />
        <CardContent>
          {devAuth ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("clientAuth.devHint")}
              </Typography>
              <TextField
                label={t("clientAuth.inviteCode")}
                fullWidth
                margin="normal"
                id="dev-invite-code"
                defaultValue={inviteFromUrl}
                helperText={t("clientAuth.devInviteHint")}
              />
              <LoadingButton
                variant="contained"
                fullWidth
                loading={isLoading}
                sx={{ mt: 1 }}
                onClick={() => {
                  const el = document.getElementById("dev-invite-code") as HTMLInputElement | null;
                  login({ invite_code: el?.value ?? inviteFromUrl });
                }}
              >
                {t("clientAuth.devLogin")}
              </LoadingButton>
            </>
          ) : (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                login({
                  email: String(fd.get("email") ?? ""),
                  password: String(fd.get("password") ?? ""),
                });
              }}
            >
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
                autoComplete="current-password"
              />
              <LoadingButton type="submit" variant="contained" fullWidth sx={{ mt: 2 }} loading={isLoading}>
                {t("login.signIn")}
              </LoadingButton>
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            {t("clientAuth.noAccount")}{" "}
            <Link
              component={RouterLink}
              to={`/client/register${inviteFromUrl ? `?invite=${encodeURIComponent(inviteFromUrl)}` : ""}`}
            >
              {t("register.signUp")}
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            <Link component={RouterLink} to="/login">
              {t("clientAuth.coachPortal")}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
