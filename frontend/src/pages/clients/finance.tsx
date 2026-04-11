import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BadgeIcon from "@mui/icons-material/Badge";
import DescriptionIcon from "@mui/icons-material/Description";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useList, useOne } from "@refinedev/core";
import { DeleteButton, EditButton } from "@refinedev/mui";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

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

function invoiceStatusColor(status: string): "success" | "error" | "warning" | "default" {
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
  const { data, isLoading } = useList<InvoiceRow>({
    resource: "invoices",
    filters: [{ field: "client_id", operator: "eq", value: clientId }],
    pagination: { pageSize: 100, mode: "server" },
  });
  const rows = (data?.data ?? []) as InvoiceRow[];
  const loc = i18n.language;

  return (
    <Card className="client-feed-card" id="client-financial-invoices">
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <DescriptionIcon fontSize="small" />
            <span>{t("clients.finance.invoices")}</span>
          </Stack>
        }
        action={
          <Link component={RouterLink} to="/invoices" sx={{ fontSize: 14 }}>
            {t("clients.finance.allInvoices")}
          </Link>
        }
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0 }}>
          {t("clients.finance.invoicesCardIntro")}
        </Typography>
        <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap" }} gap={1}>
          <Button component={RouterLink} to={`/invoices/create?client_id=${clientId}`} variant="contained" size="small">
            {t("clients.finance.addInvoice")}
          </Button>
        </Stack>

        {isLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">{t("clients.finance.noInvoicesYet")}</Typography>
        ) : (
          <Stack spacing={2} sx={{ width: "100%" }}>
            {rows.map((r) => {
              const cur = r.currency ?? "USD";
              const amountLabel =
                r.amount != null && r.amount !== "" ? formatMoney(r.amount, cur, loc) : t("common.dash");
              const statusLabel = t(`invoices.status.${r.status}` as never);
              return (
                <Card className="client-feed-card" key={r.id} variant="outlined">
                  <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                    <Grid container spacing={2} alignItems="center" wrap="wrap">
                      <Grid size={{ xs: 12, sm: 12, md: 10, lg: 11 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
                            <Typography fontWeight={600} sx={{ fontSize: 15 }}>
                              {r.reference?.trim() ? r.reference : t("clients.finance.noReference")}
                            </Typography>
                            <Chip size="small" label={statusLabel} color={invoiceStatusColor(r.status)} variant="outlined" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                            {r.due_date
                              ? `${t("clients.finance.due")} ${dayjs(r.due_date).format("MMM D, YYYY")}`
                              : t("clients.finance.noDueInCard")}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 8, md: 8, lg: 7 }}>
                        <Typography fontWeight={600} sx={{ fontSize: 16 }}>
                          {amountLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {cur}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4, md: 6, lg: 6 }} sx={{ textAlign: { xs: "start", sm: "end" } }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                          <EditButton resource="invoices" size="small" recordItemId={r.id}>
                            {t("clients.finance.editInvoice")}
                          </EditButton>
                          <DeleteButton resource="invoices" size="small" recordItemId={r.id} />
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

/** Membership subscriptions panel for one client. */
export function ClientMembershipPanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  return (
    <Card className="client-feed-card" id="client-financial-membership">
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <BadgeIcon fontSize="small" />
            <span>{t("memberships.panel.title")}</span>
          </Stack>
        }
        action={
          <Link component={RouterLink} to="/plan-templates/create" sx={{ fontSize: 14 }}>
            {t("common.quickLinks.newMembershipPlan")}
          </Link>
        }
      />
      <CardContent sx={{ "&:last-child": { pb: 2.5 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0, mb: 2.5, lineHeight: 1.55 }}>
          {t("clients.finance.membershipsCardIntro")}
        </Typography>
        <ClientSubscriptionsPanel clientId={clientId} allowMutation compactHeader splitLayout />
      </CardContent>
    </Card>
  );
}

/** Invoices + membership subscriptions stacked (standalone /finance route). */
export function ClientFinancialSection({ clientId }: { clientId: number }) {
  return (
    <Stack spacing={3} sx={{ width: "100%" }}>
      <ClientInvoicesPanel clientId={clientId} />
      <ClientMembershipPanel clientId={clientId} />
    </Stack>
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
      <Typography variant="body1">
        {t("clients.finance.invalid")}{" "}
        <Link component={RouterLink} to="/clients">
          {t("clients.finance.backToClients")}
        </Link>
      </Typography>
    );
  }

  const displayName = isLoading ? "…" : (record?.name ?? `#${validId}`);

  return (
    <div style={{ padding: 0 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/clients" underline="hover">
          {t("clients.finance.breadcrumbClients")}
        </Link>
        <Link component={RouterLink} to={`/clients/show/${validId}`} underline="hover">
          {record?.name ?? t("clients.finance.profileFallback")}
        </Link>
        <Typography color="text.primary">{t("clients.finance.breadcrumb")}</Typography>
      </Breadcrumbs>

      <Stack spacing={3} sx={{ width: "100%" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <div>
            <Typography variant="h5" component="h1" sx={{ m: 0 }}>
              {t("clients.finance.pageTitle", { name: displayName })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("clients.finance.subtitle")}
            </Typography>
          </div>
          <Button component={RouterLink} to={`/clients/show/${validId}`} variant="outlined" startIcon={<ArrowBackIcon />}>
            {t("clients.finance.backToProfile")}
          </Button>
        </Stack>

        <ClientFinancialSection clientId={validId} />
      </Stack>
    </div>
  );
}
