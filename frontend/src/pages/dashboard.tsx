import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BookIcon from "@mui/icons-material/Book";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {prefix}
            <Typography variant="h5" component="span">
              {value}
              {suffix}
            </Typography>
          </Stack>
          {foot ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              {foot}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
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

  const iconPad = { mr: 1, opacity: 0.85 as const, fontSize: 20 };

  return (
    <Stack spacing={3} sx={{ width: "100%" }}>
      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          {t("dashboard.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {loadError && !me ? (
            t("dashboard.profileError")
          ) : me ? (
            <>
              {t("dashboard.signedInAs")}{" "}
              <Typography component="span" fontWeight={600}>
                {me.name}
              </Typography>
              <Typography component="span" color="text.secondary">
                {" "}
                · {me.email}
              </Typography>
            </>
          ) : (
            t("dashboard.loadingProfile")
          )}
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {t("dashboard.insights")}
        </Typography>
        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={k}>
                <Card variant="outlined">
                  <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : loadError || !summary ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {t("dashboard.metricsError")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("dashboard.metricsHint")} <Typography component="code" variant="caption">GET /api/v1/me?insights=true</Typography>
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.activeClients")}
                  value={summary.clients_active}
                  prefix={<GroupsIcon sx={iconPad} />}
                  foot={
                    <Link to="/clients">
                      {summary.clients_total} {t("dashboard.totalRoster")}
                    </Link>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.rosterBreakdown")}
                  value={summary.clients_inactive + summary.clients_archived}
                  prefix={<PersonIcon sx={iconPad} />}
                  foot={
                    <>
                      {summary.clients_inactive} {t("dashboard.rosterFoot")} {summary.clients_archived} {t("dashboard.archived")}{" "}
                      <Link to="/clients">{t("dashboard.manage")}</Link>
                    </>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.pendingInvoiceTotal")}
                  value={formatMoney(summary.invoices_pending_amount, "USD", loc)}
                  prefix={<AttachMoneyIcon sx={iconPad} />}
                  foot={
                    <>
                      {summary.invoices_pending} {t("dashboard.open")}{" "}
                      <Box component="span" sx={{ color: summary.invoices_overdue ? "error.main" : undefined }}>
                        {summary.invoices_overdue} {t("dashboard.overdue")}
                      </Box>
                      {" · "}
                      <Link to="/invoices">{t("dashboard.invoices")}</Link>
                    </>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.activeMemberships")}
                  value={summary.active_memberships}
                  prefix={<BookIcon sx={iconPad} />}
                  foot={<Link to="/clients">{t("dashboard.assignOnProfiles")}</Link>}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard title={t("dashboard.allInvoices")} value={summary.invoices_total} foot={<Link to="/invoices">{t("dashboard.viewAll")}</Link>} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.membershipProducts")}
                  value={summary.plan_templates}
                  foot={<Link to="/plan-templates">{t("dashboard.planTemplates")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.myExercises")}
                  value={summary.exercises}
                  prefix={<FitnessCenterIcon sx={iconPad} />}
                  foot={<Link to="/exercises">{t("dashboard.exercisesLink")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <InsightCard
                  title={t("dashboard.trainingPlans")}
                  value={summary.training_plans}
                  prefix={<FormatListBulletedIcon sx={iconPad} />}
                  foot={<Link to="/training-plans">{t("dashboard.plansLink")}</Link>}
                />
              </Grid>
            </Grid>

            {summary.invoices_overdue > 0 ? (
              <Card
                variant="outlined"
                sx={{
                  mt: 1,
                  borderColor: "rgba(248, 113, 113, 0.45)",
                  bgcolor: "rgba(248, 113, 113, 0.1)",
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <WarningAmberIcon sx={{ color: "#fca5a5", fontSize: 22, mt: 0.25 }} />
                    <Box>
                      <Typography fontWeight={600} sx={{ color: "#fecaca" }}>
                        {summary.invoices_overdue}{" "}
                        {summary.invoices_overdue === 1 ? t("dashboard.overdueInvoices") : t("dashboard.overdueInvoicesPlural")}
                      </Typography>
                      <Link to="/invoices">{t("dashboard.reviewInvoices")}</Link>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {t("dashboard.library")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("dashboard.libraryHint")}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
            <Link to="/library/exercises">{t("dashboard.catalogExercises")}</Link>
            <span>·</span>
            <Link to="/library/training-plans">{t("dashboard.catalogTrainingPlans")}</Link>
            <span>·</span>
            <Link to="/library/nutrition-templates">{t("dashboard.catalogNutritionTemplates")}</Link>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
