import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useOne } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ClientCoachingPlansEditor } from "./ClientCoachingPlansEditor";

export function ClientWorkoutDietPlansPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = id ? Number(id) : Number.NaN;
  const valid = Number.isFinite(clientId);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const clientQuery = useOne({
    resource: "clients",
    id: valid ? String(clientId) : "",
    queryOptions: { enabled: valid },
  });
  const clientRecord = clientQuery.data?.data as { name?: string } | undefined;
  const clientName = clientRecord?.name;
  const clientLoading = clientQuery.isLoading ?? false;

  if (!valid) {
    return (
      <Typography variant="body1">
        {t("clients.plans.invalidClient")}{" "}
        <Link to="/clients">{t("clients.finance.backToClients")}</Link>
      </Typography>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Typography variant="body1" sx={{ mb: 1 }}>
        <Link to="/clients">{t("clients.finance.breadcrumbClients")}</Link>
        {" / "}
        <Link to={`/clients/show/${clientId}`}>{clientLoading ? "…" : (clientName ?? `#${clientId}`)}</Link>
        {" / "}
        {t("clients.plans.pageTitle")}
      </Typography>

      <Stack spacing={2} sx={{ width: "100%" }}>
        <div>
          <Typography variant="h5" component="h1" sx={{ m: 0 }}>
            {t("clients.plans.pageTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("clients.plans.pageSubtitle")}
          </Typography>
        </div>

        <ClientCoachingPlansEditor
          clientId={clientId}
          extraActions={
            <Button variant="outlined" onClick={() => navigate(`/clients/show/${clientId}#workout`)}>
              {t("clients.plans.backToClient")}
            </Button>
          }
        />
      </Stack>
    </div>
  );
}
