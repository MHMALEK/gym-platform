import { DeleteButton, EditButton, useTable } from "@refinedev/antd";
import { useOne } from "@refinedev/core";
import { ArrowLeftOutlined, FileTextOutlined, IdcardOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { formatMoney } from "../../lib/money";
import { ClientSubscriptionsPanel } from "../memberships/ClientSubscriptionsPanel";

type InvoiceRow = {
  id: number;
  client_id: number;
  reference: string | null;
  amount: string | number | null;
  currency: string;
  due_date: string | null;
  status: string;
};

function invoiceStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "success";
    case "overdue":
      return "error";
    case "sent":
    case "draft":
      return "warning";
    default:
      return "default";
  }
}

/** Invoice list as cards (embeddable in tabs or standalone). */
export function ClientInvoicesPanel({ clientId }: { clientId: number }) {
  const { t, i18n } = useTranslation();
  const { tableProps } = useTable<InvoiceRow>({
    resource: "invoices",
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "client_id", operator: "eq", value: clientId }],
    },
    pagination: { pageSize: 100, mode: "server" },
  });

  const rows = tableProps.dataSource ?? [];
  const loading = tableProps.loading;
  const loc = i18n.language;

  return (
    <Card
      id="client-financial-invoices"
      title={
        <Space>
          <FileTextOutlined />
          {t("clients.finance.invoices")}
        </Space>
      }
      extra={
        <Link to="/invoices" style={{ fontSize: 14 }}>
          {t("clients.finance.allInvoices")}
        </Link>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {t("clients.finance.invoicesCardIntro")}
      </Typography.Paragraph>
      <Space style={{ marginBottom: 16 }} wrap>
        <Link to={`/invoices/create?client_id=${clientId}`}>
          <Button type="primary">{t("clients.finance.addInvoice")}</Button>
        </Link>
      </Space>

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("clients.finance.noInvoicesYet")} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {rows.map((r) => {
            const cur = r.currency ?? "USD";
            const amountLabel =
              r.amount != null && r.amount !== ""
                ? formatMoney(r.amount, cur, loc)
                : t("common.dash");
            const statusLabel = t(`invoices.status.${r.status}` as never);
            return (
              <Card
                key={r.id}
                size="small"
                styles={{ body: { padding: "14px 16px" } }}
              >
                <Row gutter={[16, 12]} align="middle" wrap>
                  <Col xs={24} sm={12} md={10} lg={11}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Space wrap align="center">
                        <Typography.Text strong style={{ fontSize: 15 }}>
                          {r.reference?.trim() ? r.reference : t("clients.finance.noReference")}
                        </Typography.Text>
                        <Tag color={invoiceStatusColor(r.status)}>{statusLabel}</Tag>
                      </Space>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {r.due_date
                          ? `${t("clients.finance.due")} ${dayjs(r.due_date).format("MMM D, YYYY")}`
                          : t("clients.finance.noDueInCard")}
                      </Typography.Text>
                    </Space>
                  </Col>
                  <Col xs={24} sm={8} md={8} lg={7}>
                    <Typography.Text strong style={{ fontSize: 16 }}>
                      {amountLabel}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>
                      {cur}
                    </Typography.Text>
                  </Col>
                  <Col xs={24} sm={4} md={6} lg={6} style={{ textAlign: "end" }}>
                    <Space wrap>
                      <EditButton resource="invoices" size="small" recordItemId={r.id}>
                        {t("clients.finance.editInvoice")}
                      </EditButton>
                      <DeleteButton resource="invoices" size="small" recordItemId={r.id} />
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Space>
      )}
    </Card>
  );
}

/** Membership subscriptions panel for one client. */
export function ClientMembershipPanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  return (
    <Card
      id="client-financial-membership"
      title={
        <Space>
          <IdcardOutlined />
          {t("memberships.panel.title")}
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {t("clients.finance.membershipsCardIntro")}
      </Typography.Paragraph>
      <ClientSubscriptionsPanel clientId={clientId} allowMutation compactHeader />
    </Card>
  );
}

/** Invoices + membership subscriptions stacked (standalone /finance route). */
export function ClientFinancialSection({ clientId }: { clientId: number }) {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <ClientInvoicesPanel clientId={clientId} />
      <ClientMembershipPanel clientId={clientId} />
    </Space>
  );
}

export function ClientFinance() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const clientId = id ? Number(id) : NaN;
  const validId = Number.isFinite(clientId) ? clientId : null;

  const clientQuery = useOne({
    resource: "clients",
    id: validId != null ? String(validId) : "",
    queryOptions: { enabled: validId != null },
  });
  const record = clientQuery.data?.data;
  const isLoading = clientQuery.isLoading ?? false;

  if (validId == null) {
    return (
      <Typography.Paragraph>
        {t("clients.finance.invalid")}{" "}
        <Link to="/clients">{t("clients.finance.backToClients")}</Link>
      </Typography.Paragraph>
    );
  }

  const displayName = isLoading ? "…" : (record?.name ?? `#${validId}`);

  return (
    <div style={{ padding: 0 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/clients">{t("clients.finance.breadcrumbClients")}</Link> },
          {
            title: (
              <Link to={`/clients/show/${validId}`}>
                {record?.name ?? t("clients.finance.profileFallback")}
              </Link>
            ),
          },
          { title: t("clients.finance.breadcrumb") },
        ]}
      />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space align="start" style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t("clients.finance.pageTitle", { name: displayName })}
            </Typography.Title>
            <Typography.Text type="secondary">{t("clients.finance.subtitle")}</Typography.Text>
          </div>
          <Link to={`/clients/show/${validId}`}>
            <Button icon={<ArrowLeftOutlined />}>{t("clients.finance.backToProfile")}</Button>
          </Link>
        </Space>

        <ClientFinancialSection clientId={validId} />
      </Space>
    </div>
  );
}
