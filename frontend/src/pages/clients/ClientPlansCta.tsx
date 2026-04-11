import ArticleIcon from "@mui/icons-material/Article";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

export function clientWorkoutDietPath(clientId: number | string): string {
  return `/clients/show/${clientId}/workout-diet-plans`;
}

type Props = {
  clientId: number;
  /** Tighter layout when nested in forms */
  compact?: boolean;
};

/** Call-to-action to open the dedicated workout & diet plans page for this client. */
export function ClientPlansCta({ clientId, compact }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const to = clientWorkoutDietPath(clientId);
  return (
    <Alert
      severity="info"
      icon={<ArticleIcon fontSize="inherit" />}
      sx={{ mt: compact ? 1.5 : 2 }}
    >
      <AlertTitle>{t("clients.plans.ctaTitle")}</AlertTitle>
      <Stack spacing={1} sx={{ width: "100%", mt: 0.5 }}>
        <span>{t("clients.plans.ctaBody")}</span>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ArticleIcon />}
            onClick={() => navigate({ pathname: `/clients/show/${clientId}`, hash: "workout" })}
          >
            {t("clients.plans.openWorkoutTab")}
          </Button>
          <Button component={Link} to={to} size="small" variant="outlined">
            {t("clients.plans.openDedicatedPage")}
          </Button>
        </Stack>
      </Stack>
    </Alert>
  );
}
