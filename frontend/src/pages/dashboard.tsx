import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BookIcon from "@mui/icons-material/Book";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/layout/PageHeader";
import { apiPrefix, authHeaders } from "../lib/api";

type Me = { id: number; name: string; email: string };

type FinanceAlertItem = {
  invoice_id: number;
  client_id: number;
  client_name: string;
  amount: string | number | null;
  currency: string;
  due_date: string | null;
  days_overdue?: number | null;
  days_until_due?: number | null;
};

type Summary = {
  clients_total: number;
  clients_active: number;
  clients_inactive: number;
  clients_archived: number;
  invoices_total: number;
  invoices_pending: number;
  invoices_overdue: number;
  invoices_pending_amount: string | number;
  invoices_paid_amount_month?: string | number;
  invoices_paid_amount_30d?: string | number;
  finance_overdue?: FinanceAlertItem[];
  finance_due_soon?: FinanceAlertItem[];
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

function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: "0.12em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function StatTile({
  icon,
  label,
  value,
  footer,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 128,
        p: 2.25,
        borderRadius: 2,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        transition: theme.transitions.create(["background-color", "transform"], { duration: 140 }),
        "@media (hover: hover)": {
          "&:hover": {
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.08 : 0.06),
          },
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ letterSpacing: "0.06em", textTransform: "uppercase", display: "block" }}
          >
            {label}
          </Typography>
          <Typography
            variant="h5"
            component="div"
            sx={{ fontWeight: 700, letterSpacing: "-0.02em", mt: 0.35, lineHeight: 1.15 }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
      {footer ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: "auto", lineHeight: 1.5 }}>
          {footer}
        </Typography>
      ) : null}
    </Box>
  );
}

function StatTileSkeleton() {
  return (
    <Box
      sx={{
        minHeight: 128,
        p: 2.25,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" height={18} />
          <Skeleton variant="text" width="40%" height={36} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
      <Skeleton variant="text" width="70%" sx={{ mt: 2 }} />
    </Box>
  );
}

function FinanceListBlock({
  title,
  rows,
  overdueMeta,
  loc,
  t,
}: {
  title: string;
  rows: FinanceAlertItem[];
  overdueMeta?: boolean;
  loc: string;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <List dense disablePadding>
        {rows.map((row, i) => (
          <ListItem
            key={row.invoice_id}
            divider={i < rows.length - 1}
            sx={{ py: 1.25, px: 2, alignItems: "flex-start" }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" component="span">
                  <Link to={`/clients/show/${row.client_id}#invoices`} style={{ fontWeight: 600 }}>
                    {row.client_name}
                  </Link>
                  {overdueMeta && row.days_overdue != null ? (
                    <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                      {t("dashboard.daysOverdue", { n: row.days_overdue })}
                    </Typography>
                  ) : null}
                  {!overdueMeta && row.days_until_due != null ? (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {t("dashboard.daysUntilDue", { n: row.days_until_due })}
                    </Typography>
                  ) : null}
                </Typography>
              }
              secondary={
                <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mt: 0.25 }}>
                  {formatMoney(row.amount ?? 0, row.currency || "USD", loc)}
                </Typography>
              }
              secondaryTypographyProps={{ component: "div" }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
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

  const iconInTile = { fontSize: 22 };

  const subtitle =
    loadError && !me ? (
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
    );

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ width: "100%", pb: 2 }}>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary" component="span">
              {subtitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
              {t("dashboard.tagline")}
            </Typography>
          </Stack>
        }
        subtitleMaxWidth="none"
      />

      <DashboardSection title={t("dashboard.sectionSnapshot")}>
        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((k) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k}>
                <StatTileSkeleton />
              </Grid>
            ))}
          </Grid>
        ) : loadError || !summary ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {t("dashboard.metricsError")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("dashboard.metricsHint")}{" "}
              <Typography component="code" variant="caption" sx={{ userSelect: "all" }}>
                GET /api/v1/me?insights=true
              </Typography>
            </Typography>
          </Alert>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatTile
                icon={<GroupsIcon sx={iconInTile} />}
                label={t("dashboard.activeClients")}
                value={summary.clients_active}
                footer={
                  <Link to="/clients">
                    {summary.clients_total} {t("dashboard.totalRoster")}
                  </Link>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatTile
                icon={<PersonIcon sx={iconInTile} />}
                label={t("dashboard.rosterBreakdown")}
                value={summary.clients_inactive + summary.clients_archived}
                footer={
                  <>
                    {summary.clients_inactive} {t("dashboard.rosterFoot")} {summary.clients_archived}{" "}
                    {t("dashboard.archived")}{" "}
                    <Link to="/clients">{t("dashboard.manage")}</Link>
                  </>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatTile
                icon={<AttachMoneyIcon sx={iconInTile} />}
                label={t("dashboard.pendingInvoiceTotal")}
                value={formatMoney(summary.invoices_pending_amount, "USD", loc)}
                footer={
                  <>
                    {summary.invoices_pending} {t("dashboard.open")}{" "}
                    <Box
                      component="span"
                      sx={{ color: summary.invoices_overdue ? "error.main" : "text.secondary" }}
                    >
                      {summary.invoices_overdue} {t("dashboard.overdue")}
                    </Box>
                    {" · "}
                    <Link to="/invoices">{t("dashboard.invoices")}</Link>
                  </>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatTile
                icon={<BookIcon sx={iconInTile} />}
                label={t("dashboard.activeMemberships")}
                value={summary.active_memberships}
                footer={<Link to="/clients">{t("dashboard.assignOnProfiles")}</Link>}
              />
            </Grid>
          </Grid>
        )}
      </DashboardSection>

      {!loading && summary ? (
        <>
          <DashboardSection title={t("dashboard.sectionContent")}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatTile
                  label={t("dashboard.allInvoices")}
                  value={summary.invoices_total}
                  icon={<AttachMoneyIcon sx={iconInTile} />}
                  footer={<Link to="/invoices">{t("dashboard.viewAll")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatTile
                  label={t("dashboard.membershipProducts")}
                  value={summary.plan_templates}
                  icon={<BookIcon sx={iconInTile} />}
                  footer={<Link to="/plan-templates">{t("dashboard.planTemplates")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatTile
                  label={t("dashboard.myExercises")}
                  value={summary.exercises}
                  icon={<FitnessCenterIcon sx={iconInTile} />}
                  footer={<Link to="/exercises">{t("dashboard.exercisesLink")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatTile
                  label={t("dashboard.trainingPlans")}
                  value={summary.training_plans}
                  icon={<FormatListBulletedIcon sx={iconInTile} />}
                  footer={<Link to="/training-plans">{t("dashboard.plansLink")}</Link>}
                />
              </Grid>
            </Grid>
          </DashboardSection>

          <DashboardSection title={t("dashboard.sectionRevenue")}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <StatTile
                  icon={<AttachMoneyIcon sx={iconInTile} />}
                  label={t("dashboard.paidThisMonth")}
                  value={formatMoney(summary.invoices_paid_amount_month ?? 0, "USD", loc)}
                  footer={<Link to="/invoices">{t("dashboard.viewAll")}</Link>}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <StatTile
                  icon={<AttachMoneyIcon sx={iconInTile} />}
                  label={t("dashboard.paidLast30Days")}
                  value={formatMoney(summary.invoices_paid_amount_30d ?? 0, "USD", loc)}
                />
              </Grid>
            </Grid>
          </DashboardSection>

          {(summary.finance_overdue?.length ?? 0) > 0 ||
          (summary.finance_due_soon?.length ?? 0) > 0 ||
          summary.invoices_overdue > 0 ? (
            <DashboardSection title={t("dashboard.sectionAttention")}>
              <Stack spacing={2}>
                {summary.invoices_overdue > 0 ? (
                  <Alert severity="error" icon={<WarningAmberIcon />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                      {summary.invoices_overdue}{" "}
                      {summary.invoices_overdue === 1
                        ? t("dashboard.overdueInvoices")
                        : t("dashboard.overdueInvoicesPlural")}
                    </Typography>
                    <Button component={Link} to="/invoices" size="small" variant="outlined" color="inherit" sx={{ mt: 0.5 }}>
                      {t("dashboard.reviewInvoices")}
                    </Button>
                  </Alert>
                ) : null}

                {(summary.finance_overdue?.length ?? 0) > 0 || (summary.finance_due_soon?.length ?? 0) > 0 ? (
                  <Grid container spacing={2}>
                    {(summary.finance_overdue?.length ?? 0) > 0 ? (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FinanceListBlock
                          title={t("dashboard.financeOverdueList")}
                          rows={summary.finance_overdue!}
                          overdueMeta
                          loc={loc}
                          t={t}
                        />
                      </Grid>
                    ) : null}
                    {(summary.finance_due_soon?.length ?? 0) > 0 ? (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FinanceListBlock
                          title={t("dashboard.financeDueSoonList")}
                          rows={summary.finance_due_soon!}
                          loc={loc}
                          t={t}
                        />
                      </Grid>
                    ) : null}
                  </Grid>
                ) : null}
              </Stack>
            </DashboardSection>
          ) : null}

          <DashboardSection title={t("dashboard.library")}>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                {t("dashboard.libraryHint")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button component={Link} to="/library/exercises" variant="outlined" size="small" sx={{ textTransform: "none" }}>
                  {t("dashboard.catalogExercises")}
                </Button>
                <Button component={Link} to="/library/training-plans" variant="outlined" size="small" sx={{ textTransform: "none" }}>
                  {t("dashboard.catalogTrainingPlans")}
                </Button>
                <Button
                  component={Link}
                  to="/library/nutrition-templates"
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: "none" }}
                >
                  {t("dashboard.catalogNutritionTemplates")}
                </Button>
              </Stack>
            </Stack>
          </DashboardSection>
        </>
      ) : null}
    </Stack>
  );
}
