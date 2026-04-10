import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  AimOutlined,
  ContactsOutlined,
  DashboardOutlined,
  FileTextOutlined,
  IdcardOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Descriptions, Space, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { formatMoney } from "../../lib/money";
import { ClientInvoicesPanel, ClientMembershipPanel } from "./finance";
import { goalTypeLabel } from "./goalOptions";

type MembershipSnap = {
  plan_name: string;
  plan_code?: string | null;
  ends_at?: string | null;
  days_remaining?: number | null;
  source: "active_subscription" | "designated_only";
};

function MembershipSnapshotBlock({ summary }: { summary: MembershipSnap }) {
  const { t } = useTranslation();
  if (summary.source === "designated_only" && summary.ends_at == null) {
    return <span>{t("clients.show.defaultPlanOnly", { name: summary.plan_name })}</span>;
  }
  const end =
    summary.ends_at != null ? dayjs(summary.ends_at).format("MMM D, YYYY h:mm A") : t("clients.show.noFixedEnd");
  const dr = summary.days_remaining;
  let left = t("common.dash");
  if (dr != null && summary.ends_at != null) {
    if (dr < 0) left = t("clients.show.daysOverdue", { days: Math.abs(dr) });
    else if (dr === 0) left = t("clients.show.endsTodayLeft");
    else left = t("clients.show.daysRemaining", { days: dr });
  } else if (summary.ends_at == null) {
    left = t("clients.show.openEndedLeft");
  }
  const codePart = summary.plan_code ? ` (${summary.plan_code})` : "";
  return (
    <span>
      <strong>{summary.plan_name}</strong>
      {codePart} · {t("clients.show.endGlue")} {end} · <Tag>{left}</Tag>
    </span>
  );
}

type LastInvSnap = {
  id: number;
  status: string;
  is_paid: boolean;
  due_date?: string | null;
  amount?: number | string | null;
  currency: string;
  reference?: string | null;
};

function LastInvoiceSnapshotBlock({ inv }: { inv: LastInvSnap }) {
  const { t, i18n } = useTranslation();
  const label = t(`invoices.status.${inv.status}` as never);
  const cur = inv.currency ?? "USD";
  return (
    <span>
      <Tag color={inv.is_paid ? "green" : "gold"}>{label}</Tag>{" "}
      {inv.reference ? `${inv.reference} · ` : ""}
      {inv.amount != null && inv.amount !== "" ? formatMoney(inv.amount, cur, i18n.language) : t("common.dash")}
      {inv.due_date
        ? ` · ${t("clients.due")} ${dayjs(inv.due_date).format("MMM D, YYYY")}`
        : ""}
    </span>
  );
}

type ClientShowTab = "profile" | "invoices" | "membership";

function tabFromHash(hash: string): ClientShowTab {
  const h = hash.replace(/^#/, "");
  if (h === "financial") return "invoices";
  if (h === "invoices" || h === "membership") return h;
  return "profile";
}

function hashForTab(tab: ClientShowTab): string {
  if (tab === "profile") return "";
  return tab;
}

export function ClientShow() {
  const { t } = useTranslation();
  const { query } = useShow({ resource: "clients" });
  const record = query?.data?.data;
  const clientId = record?.id as number | undefined;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ClientShowTab>(() => tabFromHash(window.location.hash));

  const reg = record?.registration_date ?? record?.created_at;

  useEffect(() => {
    setActiveTab(tabFromHash(location.hash));
  }, [location.hash]);

  const goInvoicesTab = useCallback(() => {
    setActiveTab("invoices");
    navigate({ pathname: location.pathname, search: location.search, hash: "invoices" }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (query?.isLoading) return;
    const h = location.hash.replace(/^#/, "");
    if (h !== "invoices" && h !== "membership" && h !== "financial") return;
    const id = h === "membership" ? "client-tab-membership" : "client-tab-invoices";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab, location.hash, query?.isLoading]);

  const onTabChange = (key: string) => {
    const next = key as ClientShowTab;
    setActiveTab(next);
    navigate(
      { pathname: location.pathname, search: location.search, hash: hashForTab(next) },
      { replace: true },
    );
  };

  const rosterLabel =
    record?.status === "inactive"
      ? t("clients.roster.inactive")
      : record?.status === "archived"
        ? t("clients.roster.archived")
        : t("clients.roster.active");

  const ac = record?.account_status;
  const acLabel =
    ac && ["good_standing", "payment_issue", "onboarding", "churned"].includes(ac)
      ? t(`clients.accountStatus.${ac}` as never)
      : ac ?? t("common.dash");

  const profileTab = (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={
          <Space>
            <ContactsOutlined />
            {t("clients.show.cardContact")}
          </Space>
        }
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 0 }}>
          <Descriptions.Item label={t("clients.show.name")}>{record?.name}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.email")}>{record?.email ?? t("common.dash")}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.phone")}>{record?.phone ?? t("common.dash")}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.registrationDate")}>
            {reg ? dayjs(reg).format("MMM D, YYYY") : t("common.dash")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <AimOutlined />
            {t("clients.show.cardBodyGoals")}
          </Space>
        }
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 0 }}>
          <Descriptions.Item label={t("clients.show.weight")}>{record?.weight_kg ?? t("common.dash")}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.height")}>{record?.height_cm ?? t("common.dash")}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.goal")}>{goalTypeLabel(record?.goal_type)}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.membershipPlanProfile")}>
            {record?.subscription_plan_template?.name ?? t("common.dash")}
          </Descriptions.Item>
          <Descriptions.Item label={t("clients.show.goalDescription")} span={2}>
            {record?.goal?.trim() ? record.goal : t("common.dash")}
          </Descriptions.Item>
          <Descriptions.Item label={t("clients.show.subscriptionEffective")}>
            {record?.subscription_type ?? t("common.dash")}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <DashboardOutlined />
            {t("clients.show.cardSnapshot")}
          </Space>
        }
        extra={
          clientId != null ? (
            <Button type="link" onClick={goInvoicesTab} style={{ padding: 0, height: "auto" }}>
              {t("clients.show.tabInvoices")}
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t("clients.show.snapshotHint")}
        </Typography.Paragraph>
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 0 }}>
          <Descriptions.Item label={t("clients.show.currentMembership")}>
            {record?.membership_summary ? (
              <MembershipSnapshotBlock summary={record.membership_summary as MembershipSnap} />
            ) : (
              t("common.dash")
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("clients.show.latestInvoice")}>
            {record?.last_invoice_summary ? (
              <LastInvoiceSnapshotBlock inv={record.last_invoice_summary as LastInvSnap} />
            ) : (
              t("common.dash")
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <UserOutlined />
            {t("clients.show.cardAccount")}
          </Space>
        }
      >
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 0 }}>
          <Descriptions.Item label={t("clients.show.rosterField")}>{rosterLabel}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.clientStatus")}>{acLabel}</Descriptions.Item>
          <Descriptions.Item label={t("clients.show.notesLabel")} span={2}>
            {record?.notes ?? t("common.dash")}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  return (
    <Show isLoading={query?.isLoading}>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        destroyInactiveTabPane={false}
        items={[
          {
            key: "profile",
            label: (
              <span>
                <UserOutlined /> {t("clients.show.tabProfile")}
              </span>
            ),
            children: profileTab,
          },
          ...(clientId != null
            ? [
                {
                  key: "invoices" as const,
                  label: (
                    <span>
                      <FileTextOutlined /> {t("clients.show.tabInvoices")}
                    </span>
                  ),
                  children: (
                    <div id="client-tab-invoices" style={{ paddingTop: 4 }}>
                      <ClientInvoicesPanel clientId={clientId} />
                    </div>
                  ),
                },
                {
                  key: "membership" as const,
                  label: (
                    <span>
                      <IdcardOutlined /> {t("clients.show.tabMembership")}
                    </span>
                  ),
                  children: (
                    <div id="client-tab-membership" style={{ paddingTop: 4 }}>
                      <ClientMembershipPanel clientId={clientId} />
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Show>
  );
}
