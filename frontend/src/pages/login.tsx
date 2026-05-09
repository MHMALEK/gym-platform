import { useLogin } from "@refinedev/core";
import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { coachBrand } from "../theme/brand";
import { useThemeMode } from "../theme/ThemeModeContext";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function LoginPage() {
  const { mutate: login, isLoading } = useLogin();
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();

  const shellBg =
    mode === "dark"
      ? `
          radial-gradient(ellipse 90% 55% at 50% -15%, rgba(34, 197, 94, 0.22) 0%, transparent 52%),
          radial-gradient(ellipse 70% 40% at 100% 100%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
          linear-gradient(180deg, ${coachBrand.layoutBg} 0%, #07090d 55%, ${coachBrand.layoutBg} 100%)
        `
      : `
          radial-gradient(ellipse 85% 50% at 50% -12%, ${theme.palette.primary.main}33 0%, transparent 52%),
          linear-gradient(180deg, ${theme.palette.background.default} 0%, #e8eef5 50%, ${theme.palette.background.default} 100%)
        `;

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: shellBg,
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 16,
          insetInlineEnd: 16,
          zIndex: 2,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <ThemeSwitcher />
        <LanguageSwitcher />
      </Box>
      <Card sx={{ width: "min(420px, 100%)", borderRadius: 3, boxShadow: "none" }}>
        <CardHeader title={t("login.title")} />
        <CardContent>
          {devAuth ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("login.devHint")} <code>DEV_BYPASS_AUTH</code>.
              </Typography>
              <LoadingButton
                variant="contained"
                color="primary"
                fullWidth
                loading={isLoading}
                onClick={() => login({})}
              >
                {t("login.devLogin")}
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
              <LoadingButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                loading={isLoading}
              >
                {t("login.signIn")}
              </LoadingButton>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
