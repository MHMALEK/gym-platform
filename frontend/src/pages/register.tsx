import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRegister } from "@refinedev/core";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function RegisterPage() {
  const { mutate: register, isLoading } = useRegister();
  const { t } = useTranslation();

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
        <CardHeader title={t("register.title")} subheader={t("register.subtitle")} />
        <CardContent>
          {devAuth ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("login.devHint")} <code>DEV_BYPASS_AUTH</code>.
              </Typography>
              <LoadingButton
                variant="contained"
                fullWidth
                loading={isLoading}
                onClick={() => register({})}
              >
                {t("register.devRegister")}
              </LoadingButton>
            </>
          ) : (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                register({
                  name: String(fd.get("name") ?? ""),
                  email: String(fd.get("email") ?? ""),
                  password: String(fd.get("password") ?? ""),
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
              <LoadingButton type="submit" variant="contained" fullWidth sx={{ mt: 2 }} loading={isLoading}>
                {t("register.signUp")}
              </LoadingButton>
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            {t("register.haveAccount")}{" "}
            <Link component={RouterLink} to="/login">
              {t("login.signIn")}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
