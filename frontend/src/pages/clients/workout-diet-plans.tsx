import { useOne } from "@refinedev/core";
import { Button, Space, Typography } from "antd";
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
      <Typography.Paragraph>
        {t("clients.plans.invalidClient")}{" "}
        <Link to="/clients">{t("clients.finance.backToClients")}</Link>
      </Typography.Paragraph>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        <Link to="/clients">{t("clients.finance.breadcrumbClients")}</Link>
        {" / "}
        <Link to={`/clients/show/${clientId}`}>
          {clientLoading ? "…" : (clientName ?? `#${clientId}`)}
        </Link>
        {" / "}
        {t("clients.plans.pageTitle")}
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t("clients.plans.pageTitle")}
          </Typography.Title>
          <Typography.Text type="secondary">{t("clients.plans.pageSubtitle")}</Typography.Text>
        </div>

        <ClientCoachingPlansEditor
          clientId={clientId}
          extraActions={
            <Button onClick={() => navigate(`/clients/show/${clientId}#workout`)}>
              {t("clients.plans.backToClient")}
            </Button>
          }
        />
      </Space>
    </div>
  );
}
