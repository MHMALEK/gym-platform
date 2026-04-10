import { DeleteButton, EditButton, useTable } from "@refinedev/antd";
import { useOne } from "@refinedev/core";
import { ArrowLeftOutlined, FileTextOutlined, IdcardOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Card, Space, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

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

/** Invoice list + actions for one client (embeddable in tabs or standalone pages). */
export function ClientInvoicesPanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const { tableProps: invoiceTableProps } = useTable<InvoiceRow>({
    resource: "invoices",
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "client_id", operator: "eq", value: clientId }],
    },
  });

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
      <Space style={{ marginBottom: 12 }} wrap>
        <Link to={`/invoices/create?client_id=${clientId}`}>
          <Button type="primary">{t("clients.finance.addInvoice")}</Button>
        </Link>
      </Space>
      <Table<InvoiceRow>
        {...invoiceTableProps}
        rowKey="id"
        scroll={{ x: 640 }}
        columns={[
          {
            title: t("clients.finance.reference"),
            dataIndex: "reference",
            render: (v: string | null) => v ?? t("common.dash"),
          },
          {
            title: t("clients.finance.amount"),
            render: (_, r) => (r.amount != null ? `${r.amount} ${r.currency}` : t("common.dash")),
          },
          {
            title: t("clients.finance.due"),
            dataIndex: "due_date",
            render: (v: string | null) => (v ? dayjs(v).format("MMM D, YYYY") : t("common.dash")),
          },
          {
            title: t("clients.finance.status"),
            dataIndex: "status",
            render: (v: string) => t(`invoices.status.${v}` as never),
          },
          {
            title: t("clients.actions"),
            render: (_, r) => (
              <Space>
                <EditButton resource="invoices" hideText size="small" recordItemId={r.id} />
                <DeleteButton resource="invoices" hideText size="small" recordItemId={r.id} />
              </Space>
            ),
          },
        ]}
      />
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
