import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/mui";
import dayjs from "dayjs";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { formatMoney } from "../../lib/money";
import { ClientCoachingPlanAssignmentPanel } from "./ClientCoachingPlanAssignmentPanel";
import { ClientPlansCta, clientPlanViewerPath, clientWorkoutDietPath } from "./ClientPlansCta";
import {
  type ClientDetailTab,
  clientDetailTabsSx,
  clientTabScrollIds,
  hashForTab,
  tabFromHash,
} from "./clientTabNav";
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
      {codePart} · {t("clients.show.endGlue")} {end} · <Chip size="small" label={left} variant="outlined" />
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
      <Chip
        size="small"
        label={label}
        color={inv.is_paid ? "success" : "warning"}
        variant="outlined"
        sx={{ mr: 0.5 }}
      />{" "}
      {inv.reference ? `${inv.reference} · ` : ""}
      {inv.amount != null && inv.amount !== "" ? formatMoney(inv.amount, cur, i18n.language) : t("common.dash")}
      {inv.due_date ? ` · ${t("clients.due")} ${dayjs(inv.due_date).format("MMM D, YYYY")}` : ""}
    </span>
  );
}

const profileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "18px 28px",
} as const;

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ fontSize: 15, lineHeight: 1.5 }}>{children}</Box>
    </div>
  );
}

export function ClientShow() {
  const { t } = useTranslation();
  const { query } = useShow({ resource: "clients" });
  const record = query?.data?.data;
  const clientId = record?.id as number | undefined;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ClientDetailTab>(() => tabFromHash(window.location.hash));

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
    if (h !== "invoices" && h !== "membership" && h !== "financial" && h !== "workout") return;
    const id =
      h === "membership"
        ? clientTabScrollIds.membership
        : h === "workout"
          ? clientTabScrollIds.workout
          : clientTabScrollIds.invoices;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab, location.hash, query?.isLoading]);

  const onTabChange = (_: React.SyntheticEvent, key: ClientDetailTab) => {
    setActiveTab(key);
    navigate(
      { pathname: location.pathname, search: location.search, hash: hashForTab(key) },
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

  const readonlyCard = "client-section-card client-section-card--readonly";

  const profileTab = (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      <Card variant="outlined" className={readonlyCard}>
        <CardHeader
          avatar={<ContactsOutlinedIcon />}
          title={t("clients.show.cardContact")}
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ pt: 2 }}>
          <div style={profileGrid}>
            <ProfileField label={t("clients.show.name")}>
              <Typography fontWeight={600}>{record?.name ?? t("common.dash")}</Typography>
            </ProfileField>
            <ProfileField label={t("clients.show.email")}>{record?.email ?? t("common.dash")}</ProfileField>
            <ProfileField label={t("clients.show.phone")}>{record?.phone ?? t("common.dash")}</ProfileField>
            <ProfileField label={t("clients.show.registrationDate")}>
              {reg ? dayjs(reg).format("MMM D, YYYY") : t("common.dash")}
            </ProfileField>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined" className={readonlyCard}>
        <CardHeader
          avatar={<TrackChangesOutlinedIcon />}
          title={t("clients.show.cardBodyGoals")}
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ pt: 2 }}>
          <div style={profileGrid}>
            <ProfileField label={t("clients.show.weight")}>{record?.weight_kg ?? t("common.dash")}</ProfileField>
            <ProfileField label={t("clients.show.height")}>{record?.height_cm ?? t("common.dash")}</ProfileField>
            <ProfileField label={t("clients.show.goal")}>{goalTypeLabel(record?.goal_type)}</ProfileField>
            <ProfileField label={t("clients.show.membershipPlanProfile")}>
              {record?.subscription_plan_template?.name ?? t("common.dash")}
            </ProfileField>
            <ProfileField label={t("clients.show.subscriptionEffective")}>
              {record?.subscription_type ?? t("common.dash")}
            </ProfileField>
            <div style={{ gridColumn: "1 / -1" }}>
              <ProfileField label={t("clients.show.goalDescription")}>
                {record?.goal?.trim() ? (
                  <Typography sx={{ whiteSpace: "pre-wrap", m: 0 }}>{record.goal}</Typography>
                ) : (
                  t("common.dash")
                )}
              </ProfileField>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined" className={readonlyCard}>
        <CardHeader
          avatar={<DashboardOutlinedIcon />}
          title={t("clients.show.cardSnapshot")}
          action={
            clientId != null ? (
              <Button size="small" onClick={goInvoicesTab}>
                {t("clients.show.tabInvoices")}
              </Button>
            ) : null
          }
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("clients.show.snapshotHint")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <ProfileField label={t("clients.show.currentMembership")}>
                {record?.membership_summary ? (
                  <MembershipSnapshotBlock summary={record.membership_summary as MembershipSnap} />
                ) : (
                  t("common.dash")
                )}
              </ProfileField>
            </Grid>
            <Grid size={12}>
              <Divider sx={{ my: 0.5 }} />
              <ProfileField label={t("clients.show.latestInvoice")}>
                {record?.last_invoice_summary ? (
                  <LastInvoiceSnapshotBlock inv={record.last_invoice_summary as LastInvSnap} />
                ) : (
                  t("common.dash")
                )}
              </ProfileField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" className={readonlyCard}>
        <CardHeader avatar={<PersonOutlinedIcon />} title={t("clients.show.cardAccount")} sx={{ pb: 0 }} />
        <CardContent sx={{ pt: 2 }}>
          <div style={profileGrid}>
            <ProfileField label={t("clients.show.rosterField")}>
              <Chip size="small" label={rosterLabel} variant="outlined" />
            </ProfileField>
            <ProfileField label={t("clients.show.clientStatus")}>
              <Chip size="small" label={acLabel} color="primary" variant="outlined" />
            </ProfileField>
            <div style={{ gridColumn: "1 / -1" }}>
              <ProfileField label={t("clients.show.notesLabel")}>
                {record?.notes?.trim() ? (
                  <Typography sx={{ whiteSpace: "pre-wrap", m: 0 }}>{record.notes}</Typography>
                ) : (
                  t("common.dash")
                )}
              </ProfileField>
            </div>
          </div>
        </CardContent>
      </Card>

      {clientId != null ? <ClientPlansCta clientId={clientId} /> : null}
    </Stack>
  );

  return (
    <Show
      isLoading={query?.isLoading}
      contentProps={{ sx: { pt: 1, px: 1.5 } }}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button component={Link} to="/clients/create" variant="outlined" size="medium">
            {t("common.quickLinks.newClient")}
          </Button>
          {record?.id != null ? (
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                size="medium"
                startIcon={<ArticleOutlinedIcon />}
                onClick={() =>
                  navigate({ pathname: location.pathname, search: location.search, hash: "workout" })
                }
              >
                {t("clients.plans.headerButton")}
              </Button>
              <Button component={Link} to={clientWorkoutDietPath(record.id)} size="small" variant="outlined">
                {t("clients.plans.openFullPage")}
              </Button>
              <Button component={Link} to={clientPlanViewerPath(record.id)} size="small" variant="contained">
                View client plan
              </Button>
            </Stack>
          ) : null}
        </>
      )}
    >
      <Box className="client-page-shell">
        {record?.id != null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>{t("clients.show.viewModeTitle")}</AlertTitle>
            <Stack spacing={1}>
              <span>{t("clients.show.viewModeDescription")}</span>
              <Button component={Link} to={`/clients/edit/${record.id}`} variant="contained" size="small" sx={{ alignSelf: "flex-start" }}>
                {t("clients.show.goToEdit")}
              </Button>
            </Stack>
          </Alert>
        )}
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={clientDetailTabsSx}
        >
          <Tab
            icon={<PersonOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label={t("clients.show.tabProfile")}
            value="profile"
          />
          {clientId != null ? (
            <Tab
              icon={<DescriptionOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabWorkout")}
              value="workout"
            />
          ) : null}
          {clientId != null ? (
            <Tab
              icon={<ArticleOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabInvoices")}
              value="invoices"
            />
          ) : null}
          {clientId != null ? (
            <Tab
              icon={<CreditCardOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabMembership")}
              value="membership"
            />
          ) : null}
        </Tabs>

        <Box sx={{ display: activeTab === "profile" ? "block" : "none" }}>{profileTab}</Box>
        {clientId != null ? (
          <Box id={clientTabScrollIds.workout} sx={{ display: activeTab === "workout" ? "block" : "none", pt: 0.5 }}>
            <ClientCoachingPlanAssignmentPanel
              clientId={clientId}
              summaryVariant="view"
              hideNutritionSection
            />
          </Box>
        ) : null}
        {clientId != null ? (
          <Box id={clientTabScrollIds.invoices} sx={{ display: activeTab === "invoices" ? "block" : "none", pt: 0.5 }}>
            <ClientInvoicesPanel clientId={clientId} />
          </Box>
        ) : null}
        {clientId != null ? (
          <Box id={clientTabScrollIds.membership} sx={{ display: activeTab === "membership" ? "block" : "none", pt: 0.5 }}>
            <ClientMembershipPanel clientId={clientId} />
          </Box>
        ) : null}
      </Box>
    </Show>
  );
}
