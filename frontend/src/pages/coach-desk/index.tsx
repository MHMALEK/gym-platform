import { useList } from "@refinedev/core";
import type { BaseRecord } from "@refinedev/core";
import { Card, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatMoney } from "../../lib/money";

type MembershipSummary = {
  plan_name: string;
  plan_code?: string | null;
  ends_at?: string | null;
  days_remaining?: number | null;
  source: "active_subscription" | "designated_only";
};

type LastInvoiceSummary = {
  id: number;
  status: string;
  is_paid: boolean;
  due_date?: string | null;
  amount?: number | string | null;
  currency: string;
  reference?: string | null;
};

function membershipSummary(r: BaseRecord): MembershipSummary | undefined {
  const x = r as Record<string, unknown>;
  return (x.membership_summary ?? x.membershipSummary) as MembershipSummary | undefined;
}

function lastInvoiceSummary(r: BaseRecord): LastInvoiceSummary | undefined {
  const x = r as Record<string, unknown>;
  return (x.last_invoice_summary ?? x.lastInvoiceSummary) as LastInvoiceSummary | undefined;
}

/** Backend caps `limit` (e.g. le=200 on list endpoints). */
const LIST_PAGE_SIZE = 200;

function invoiceIsOverdue(inv: LastInvoiceSummary, today: dayjs.Dayjs): boolean {
  if (inv.status === "overdue") return true;
  if (inv.status === "pending" && inv.due_date) {
    return dayjs(inv.due_date).startOf("day").isBefore(today);
  }
  return false;
}

function sortTier(r: BaseRecord): number {
  const inv = lastInvoiceSummary(r);
  if (
    inv?.status === "overdue" ||
    (inv?.status === "pending" && inv.due_date)
  ) {
    return 0;
  }
  if (inv?.status === "pending") return 1;
  const ms = membershipSummary(r);
  if (ms?.ends_at) return 2;
  return 3;
}

function sortDateValue(r: BaseRecord): number {
  const inv = lastInvoiceSummary(r);
  if (inv && (inv.status === "overdue" || inv.status === "pending") && inv.due_date) {
    return dayjs(inv.due_date).startOf("day").valueOf();
  }
  const ms = membershipSummary(r);
  if (ms?.ends_at) {
    return dayjs(ms.ends_at).valueOf();
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Trainer home: roster at a glance — client status, last invoice, what is due next.
 */
export function CoachDeskPage() {
  const { t, i18n } = useTranslation();
  const { data: clientsData, isLoading } = useList({
    resource: "clients",
    pagination: { pageSize: LIST_PAGE_SIZE, mode: "server" },
  });
  const loc = i18n.language;
  const today = dayjs().startOf("day");

  const clients = clientsData?.data ?? [];

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const ta = sortTier(a);
      const tb = sortTier(b);
      if (ta !== tb) return ta - tb;
      return sortDateValue(a) - sortDateValue(b);
    });
  }, [clients]);

  function invoiceStatusLabel(status: string): string {
    const key = `invoices.status.${status}` as const;
    const tr = t(key);
    return tr === key ? status : tr;
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t("coachDesk.title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("coachDesk.subtitle")}
          </Typography.Paragraph>
        </div>

        <Card size="small">
          <Table<BaseRecord>
            size="middle"
            rowKey="id"
            loading={isLoading}
            pagination={false}
            dataSource={sortedClients}
            locale={{ emptyText: t("coachDesk.emptyRoster") }}
            scroll={{ x: 720 }}
            columns={[
              {
                title: t("clients.client"),
                width: 220,
                fixed: "left" as const,
                render: (_, r) => (
                  <Link to={`/clients/show/${r.id}`}>
                    <Typography.Text strong>{String(r.name ?? "")}</Typography.Text>
                  </Link>
                ),
              },
              {
                title: t("coachDesk.colStatus"),
                width: 130,
                render: (_, r) => {
                  const st = String(r.status ?? "active");
                  const roster =
                    st === "inactive"
                      ? t("clients.roster.inactive")
                      : st === "archived"
                        ? t("clients.roster.archived")
                        : t("clients.roster.active");
                  const color =
                    st === "inactive" ? "orange" : st === "archived" ? "default" : "green";
                  return <Tag color={color}>{roster}</Tag>;
                },
              },
              {
                title: t("coachDesk.colInvoice"),
                width: 220,
                render: (_, r) => {
                  const inv = lastInvoiceSummary(r);
                  if (!inv) {
                    return <Typography.Text type="secondary">{t("clients.noInvoices")}</Typography.Text>;
                  }
                  const cur = inv.currency ?? "USD";
                  const overdue = invoiceIsOverdue(inv, today);
                  const tagColor = inv.is_paid
                    ? "green"
                    : overdue || inv.status === "overdue"
                      ? "red"
                      : inv.status === "pending"
                        ? "gold"
                        : "default";
                  const label = inv.is_paid
                    ? t("clients.paid")
                    : overdue
                      ? t("invoices.status.overdue")
                      : invoiceStatusLabel(inv.status);
                  return (
                    <Space direction="vertical" size={2}>
                      <Tag color={tagColor}>{label}</Tag>
                      {inv.amount != null && inv.amount !== "" ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {formatMoney(inv.amount, cur, loc)}
                        </Typography.Text>
                      ) : null}
                    </Space>
                  );
                },
              },
              {
                title: t("coachDesk.colDue"),
                width: 200,
                render: (_, r) => {
                  const inv = lastInvoiceSummary(r);
                  const ms = membershipSummary(r);

                  if (
                    inv &&
                    (inv.status === "pending" || inv.status === "overdue") &&
                    inv.due_date
                  ) {
                    const d = dayjs(inv.due_date).startOf("day");
                    const overdue = invoiceIsOverdue(inv, today);
                    return (
                      <Space direction="vertical" size={4}>
                        <Typography.Text strong={overdue} type={overdue ? "danger" : undefined}>
                          {d.format("MMM D, YYYY")}
                        </Typography.Text>
                        {overdue ? (
                          <Tag color="red">{t("invoices.status.overdue")}</Tag>
                        ) : null}
                      </Space>
                    );
                  }

                  if (inv?.status === "pending" && !inv.due_date) {
                    return (
                      <Typography.Text type="secondary">{t("clients.noDueDate")}</Typography.Text>
                    );
                  }

                  if (inv?.status === "overdue" && !inv.due_date) {
                    return <Tag color="red">{t("invoices.status.overdue")}</Tag>;
                  }

                  if (ms?.ends_at) {
                    const d = dayjs(ms.ends_at);
                    return (
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {t("coachDesk.dueMembershipEnds", { date: d.format("MMM D, YYYY") })}
                      </Typography.Text>
                    );
                  }

                  return (
                    <Typography.Text type="secondary">{t("common.dash")}</Typography.Text>
                  );
                },
              },
            ]}
          />
        </Card>

        <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
          <Space wrap size="middle">
            <Link to="/clients">{t("coachDesk.viewClients")}</Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link to="/invoices">{t("coachDesk.viewInvoices")}</Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link to="/dashboard">{t("coachDesk.openDashboard")}</Link>
          </Space>
        </Typography.Paragraph>
      </Space>
    </div>
  );
}
