import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Space, Table, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatMoney } from "../../lib/money";

const rosterColor: Record<string, string> = {
  active: "green",
  inactive: "orange",
  archived: "default",
};

const accountColor: Record<string, string> = {
  good_standing: "green",
  payment_issue: "red",
  onboarding: "blue",
  churned: "default",
};

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

export function ClientList() {
  const { t, i18n } = useTranslation();
  const { tableProps } = useTable({ resource: "clients", syncWithLocation: true });
  const loc = i18n.language;

  function invoiceStatusLabel(status: string): string {
    const key = `invoices.status.${status}` as const;
    const tr = t(key);
    return tr === key ? status : tr;
  }

  function timeLeftTag(ms: MembershipSummary | undefined) {
    if (!ms) return <Typography.Text type="secondary">{t("common.dash")}</Typography.Text>;
    if (ms.source === "designated_only" && ms.ends_at == null) {
      return (
        <Tooltip title={t("clients.defaultPlanTooltip")}>
          <Tag>{t("clients.defaultPlanTag")}</Tag>
        </Tooltip>
      );
    }
    if (ms.ends_at == null) {
      return (
        <Tooltip title={t("clients.openEndedTooltip")}>
          <Tag color="blue">{t("clients.openEnded")}</Tag>
        </Tooltip>
      );
    }
    const d = ms.days_remaining;
    if (d == null) return t("common.dash");
    if (d < 0) {
      return <Tag color="red">{t("clients.endedAgo", { days: Math.abs(d) })}</Tag>;
    }
    if (d === 0) {
      return <Tag color="orange">{t("clients.endsToday")}</Tag>;
    }
    if (d <= 7) {
      return <Tag color="orange">{t("clients.daysLeft", { days: d })}</Tag>;
    }
    return <Tag color="green">{t("clients.daysLeft", { days: d })}</Tag>;
  }

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1100 }} size="middle">
        <Table.Column<BaseRecord>
          title={t("clients.client")}
          width={220}
          fixed="left"
          render={(_, r: BaseRecord) => (
            <Space direction="vertical" size={0}>
              <Link to={`/clients/show/${r.id}`}>
                <Typography.Text strong>{String(r.name ?? "")}</Typography.Text>
              </Link>
              {r.email ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                  {String(r.email)}
                </Typography.Text>
              ) : null}
            </Space>
          )}
        />
        <Table.Column<BaseRecord>
          title={t("clients.membership")}
          width={220}
          render={(_, r: BaseRecord) => {
            const ms = membershipSummary(r);
            if (!ms) {
              return <Typography.Text type="secondary">{t("clients.none")}</Typography.Text>;
            }
            return (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{ms.plan_name}</Typography.Text>
                <Space size={4} wrap>
                  {ms.plan_code ? <Tag>{ms.plan_code}</Tag> : null}
                  {ms.source === "designated_only" && ms.ends_at == null ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("clients.noActiveTerm")}
                    </Typography.Text>
                  ) : null}
                </Space>
              </Space>
            );
          }}
        />
        <Table.Column<BaseRecord>
          title={t("clients.endsTimeLeft")}
          width={160}
          render={(_, r: BaseRecord) => {
            const ms = membershipSummary(r);
            if (!ms || (ms.source === "designated_only" && ms.ends_at == null)) {
              return timeLeftTag(ms);
            }
            const line =
              ms.ends_at != null ? dayjs(ms.ends_at).format("MMM D, YYYY") : t("clients.noEndDate");
            return (
              <Space direction="vertical" size={4}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {line}
                </Typography.Text>
                {timeLeftTag(ms)}
              </Space>
            );
          }}
        />
        <Table.Column<BaseRecord>
          title={t("clients.lastInvoice")}
          width={200}
          render={(_, r: BaseRecord) => {
            const inv = lastInvoiceSummary(r);
            if (!inv) {
              return <Typography.Text type="secondary">{t("clients.noInvoices")}</Typography.Text>;
            }
            const cur = inv.currency ?? "USD";
            return (
              <Space direction="vertical" size={2}>
                <Space size={6} wrap>
                  <Tag color={inv.is_paid ? "green" : inv.status === "overdue" ? "red" : "gold"}>
                    {inv.is_paid ? t("clients.paid") : invoiceStatusLabel(inv.status)}
                  </Tag>
                  {inv.amount != null && inv.amount !== "" ? (
                    <Typography.Text>{formatMoney(inv.amount, cur, loc)}</Typography.Text>
                  ) : null}
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {inv.reference ? `${inv.reference} · ` : ""}
                  {inv.due_date
                    ? `${t("clients.due")} ${dayjs(inv.due_date).format("MMM D")}`
                    : t("clients.noDueDate")}
                </Typography.Text>
              </Space>
            );
          }}
        />
        <Table.Column<BaseRecord>
          title={t("clients.account")}
          width={200}
          render={(_, r: BaseRecord) => {
            const st = String(r.status ?? "active");
            const roster =
              st === "inactive"
                ? t("clients.roster.inactive")
                : st === "archived"
                  ? t("clients.roster.archived")
                  : t("clients.roster.active");
            const ac = String(r.account_status ?? "");
            const acKnown = ["good_standing", "payment_issue", "onboarding", "churned"].includes(ac);
            const acLabel = acKnown ? t(`clients.accountStatus.${ac}` as never) : ac;
            return (
              <Space direction="vertical" size={4}>
                <Tag color={rosterColor[st] ?? "default"}>{roster}</Tag>
                <Tag color={accountColor[ac] ?? "default"}>{acLabel}</Tag>
              </Space>
            );
          }}
        />
        <Table.Column<BaseRecord>
          title={t("clients.actions")}
          width={200}
          fixed="right"
          render={(_, record: BaseRecord) => (
            <Space wrap size="small">
              <Link to={`/clients/show/${record.id}#invoices`}>
                <Typography.Link>{t("actions.financial")}</Typography.Link>
              </Link>
              <EditButton resource="clients" hideText size="small" recordItemId={record.id} />
              <ShowButton resource="clients" hideText size="small" recordItemId={record.id} />
              <DeleteButton resource="clients" hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
