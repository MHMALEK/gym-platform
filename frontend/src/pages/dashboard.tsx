import {
  BookOutlined,
  DollarOutlined,
  FireOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Skeleton, Space, Statistic, Typography } from "antd";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../lib/api";

type Me = { id: number; name: string; email: string };

type Summary = {
  clients_total: number;
  clients_active: number;
  clients_inactive: number;
  clients_archived: number;
  invoices_total: number;
  invoices_pending: number;
  invoices_overdue: number;
  invoices_pending_amount: string | number;
  active_memberships: number;
  plan_templates: number;
  exercises: number;
  training_plans: number;
};

type MeWithInsights = Me & { insights?: Summary | null };

function formatMoney(amount: string | number | undefined, currency = "USD", locale?: string): string {
  if (amount == null) return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(n)) return "—";
  const loc = locale?.startsWith("fa") ? "fa-IR" : "en-US";
  return new Intl.NumberFormat(loc, { style: "currency", currency }).format(n);
}

function InsightCard({
  title,
  value,
  suffix,
  prefix,
  foot,
}: {
  title: string;
  value: number | string;
  suffix?: ReactNode;
  prefix?: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <Card size="small" styles={{ body: { padding: "16px 20px" } }}>
      <Statistic title={title} value={value} suffix={suffix} prefix={prefix} />
      {foot ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
          {foot}
        </Typography.Text>
      ) : null}
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loc = i18n.language;

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    void fetch(`${apiPrefix}/me?insights=true`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<MeWithInsights>;
      })
      .then((data) => {
        setMe({ id: data.id, name: data.name, email: data.email });
        if (data.insights && typeof data.insights === "object") {
          setSummary(data.insights);
          setLoadError(false);
        } else {
          setSummary(null);
          setLoadError(true);
        }
      })
      .catch(() => {
        setMe(null);
        setSummary(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const iconPad = { marginInlineEnd: 8, opacity: 0.85 as const };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t("dashboard.title")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {loadError && !me ? (
            t("dashboard.profileError")
          ) : me ? (
            <>
              {t("dashboard.signedInAs")} <Typography.Text strong>{me.name}</Typography.Text>
              <Typography.Text type="secondary"> · {me.email}</Typography.Text>
            </>
          ) : (
            t("dashboard.loadingProfile")
          )}
        </Typography.Paragraph>
      </div>

      <div>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          {t("dashboard.insights")}
        </Typography.Title>
        {loading ? (
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <Col xs={24} sm={12} lg={8} key={k}>
                <Card size="small">
                  <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : loadError || !summary ? (
          <Card size="small">
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              <Typography.Text type="danger">{t("dashboard.metricsError")}</Typography.Text>
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t("dashboard.metricsHint")}{" "}
              <Typography.Text code>GET /api/v1/me?insights=true</Typography.Text>
            </Typography.Paragraph>
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.activeClients")}
                  value={summary.clients_active}
                  prefix={<TeamOutlined style={iconPad} />}
                  foot={
                    <Link to="/clients">
                      {summary.clients_total} {t("dashboard.totalRoster")}
                    </Link>
                  }
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.rosterBreakdown")}
                  value={summary.clients_inactive + summary.clients_archived}
                  prefix={<UserOutlined style={iconPad} />}
                  foot={
                    <>
                      {summary.clients_inactive} {t("dashboard.rosterFoot")}{" "}
                      {summary.clients_archived} {t("dashboard.archived")}{" "}
                      <Link to="/clients">{t("dashboard.manage")}</Link>
                    </>
                  }
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.pendingInvoiceTotal")}
                  value={formatMoney(summary.invoices_pending_amount, "USD", loc)}
                  prefix={<DollarOutlined style={iconPad} />}
                  foot={
                    <>
                      {summary.invoices_pending} {t("dashboard.open")}{" "}
                      <span style={{ color: summary.invoices_overdue ? "#cf1322" : undefined }}>
                        {summary.invoices_overdue} {t("dashboard.overdue")}
                      </span>
                      {" · "}
                      <Link to="/invoices">{t("dashboard.invoices")}</Link>
                    </>
                  }
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.activeMemberships")}
                  value={summary.active_memberships}
                  prefix={<BookOutlined style={iconPad} />}
                  foot={<Link to="/clients">{t("dashboard.assignOnProfiles")}</Link>}
                />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.allInvoices")}
                  value={summary.invoices_total}
                  foot={<Link to="/invoices">{t("dashboard.viewAll")}</Link>}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.membershipProducts")}
                  value={summary.plan_templates}
                  foot={<Link to="/plan-templates">{t("dashboard.planTemplates")}</Link>}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.myExercises")}
                  value={summary.exercises}
                  prefix={<FireOutlined style={iconPad} />}
                  foot={<Link to="/exercises">{t("dashboard.exercisesLink")}</Link>}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <InsightCard
                  title={t("dashboard.trainingPlans")}
                  value={summary.training_plans}
                  prefix={<UnorderedListOutlined style={iconPad} />}
                  foot={<Link to="/training-plans">{t("dashboard.plansLink")}</Link>}
                />
              </Col>
            </Row>

            {summary.invoices_overdue > 0 ? (
              <Card
                size="small"
                style={{
                  marginTop: 8,
                  borderColor: "rgba(248, 113, 113, 0.45)",
                  background: "rgba(248, 113, 113, 0.1)",
                }}
              >
                <Space align="start">
                  <WarningOutlined style={{ color: "#fca5a5", fontSize: 18, marginTop: 2 }} />
                  <div>
                    <Typography.Text strong style={{ color: "#fecaca" }}>
                      {summary.invoices_overdue}{" "}
                      {summary.invoices_overdue === 1
                        ? t("dashboard.overdueInvoices")
                        : t("dashboard.overdueInvoicesPlural")}
                    </Typography.Text>
                    <div>
                      <Link to="/invoices">{t("dashboard.reviewInvoices")}</Link>
                    </div>
                  </div>
                </Space>
              </Card>
            ) : null}
          </>
        )}
      </div>

      <Card size="small" title={t("dashboard.library")}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("dashboard.libraryHint")}
        </Typography.Paragraph>
        <Space wrap>
          <Link to="/library/exercises">{t("dashboard.catalogExercises")}</Link>
          <span>·</span>
          <Link to="/library/training-plans">{t("dashboard.catalogTrainingPlans")}</Link>
        </Space>
      </Card>
    </Space>
  );
}
