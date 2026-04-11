import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useDataGrid,
} from "@refinedev/mui";
import { type BaseRecord } from "@refinedev/core";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatMoney } from "../../lib/money";

const rosterChipColor: Record<string, "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  archived: "default",
};

const accountChipColor: Record<string, "success" | "error" | "info" | "default"> = {
  good_standing: "success",
  payment_issue: "error",
  onboarding: "info",
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
  const { dataGridProps } = useDataGrid({ resource: "clients", syncWithLocation: true });
  const loc = i18n.language;

  function invoiceStatusLabel(status: string): string {
    const key = `invoices.status.${status}` as const;
    const tr = t(key);
    return tr === key ? status : tr;
  }

  function timeLeftTag(ms: MembershipSummary | undefined) {
    if (!ms) return <Typography color="text.secondary">{t("common.dash")}</Typography>;
    if (ms.source === "designated_only" && ms.ends_at == null) {
      return (
        <Tooltip title={t("clients.defaultPlanTooltip")}>
          <Chip size="small" label={t("clients.defaultPlanTag")} />
        </Tooltip>
      );
    }
    if (ms.ends_at == null) {
      return (
        <Tooltip title={t("clients.openEndedTooltip")}>
          <Chip size="small" color="info" label={t("clients.openEnded")} />
        </Tooltip>
      );
    }
    const d = ms.days_remaining;
    if (d == null) return t("common.dash");
    if (d < 0) {
      return <Chip size="small" color="error" label={t("clients.endedAgo", { days: Math.abs(d) })} />;
    }
    if (d === 0) {
      return <Chip size="small" color="warning" label={t("clients.endsToday")} />;
    }
    if (d <= 7) {
      return <Chip size="small" color="warning" label={t("clients.daysLeft", { days: d })} />;
    }
    return <Chip size="small" color="success" label={t("clients.daysLeft", { days: d })} />;
  }

  const columns: GridColDef<BaseRecord>[] = [
      {
        field: "client",
        headerName: t("clients.client"),
        flex: 1.1,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack spacing={0} sx={{ py: 0.5 }}>
            <MuiLink component={Link} to={`/clients/show/${row.id}`} fontWeight={600} underline="hover">
              {String(row.name ?? "")}
            </MuiLink>
            {row.email ? (
              <Typography variant="caption" color="text.secondary" noWrap>
                {String(row.email)}
              </Typography>
            ) : null}
          </Stack>
        ),
      },
      {
        field: "membership",
        headerName: t("clients.membership"),
        flex: 1.1,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => {
          const ms = membershipSummary(row);
          if (!ms) {
            return <Typography color="text.secondary">{t("clients.none")}</Typography>;
          }
          return (
            <Stack spacing={0.5} sx={{ py: 0.5 }}>
              <Typography fontWeight={600}>{ms.plan_name}</Typography>
              <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
                {ms.plan_code ? <Chip size="small" label={ms.plan_code} /> : null}
                {ms.source === "designated_only" && ms.ends_at == null ? (
                  <Typography variant="caption" color="text.secondary">
                    {t("clients.noActiveTerm")}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          );
        },
      },
      {
        field: "endsTimeLeft",
        headerName: t("clients.endsTimeLeft"),
        width: 160,
        sortable: false,
        renderCell: ({ row }) => {
          const ms = membershipSummary(row);
          if (!ms || (ms.source === "designated_only" && ms.ends_at == null)) {
            return timeLeftTag(ms);
          }
          const line =
            ms.ends_at != null ? dayjs(ms.ends_at).format("MMM D, YYYY") : t("clients.noEndDate");
          return (
            <Stack spacing={0.5} sx={{ py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {line}
              </Typography>
              {timeLeftTag(ms)}
            </Stack>
          );
        },
      },
      {
        field: "lastInvoice",
        headerName: t("clients.lastInvoice"),
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const inv = lastInvoiceSummary(row);
          if (!inv) {
            return <Typography color="text.secondary">{t("clients.noInvoices")}</Typography>;
          }
          const cur = inv.currency ?? "USD";
          const chipColor = inv.is_paid
            ? "success"
            : inv.status === "overdue"
              ? "error"
              : "warning";
          return (
            <Stack spacing={0.25} sx={{ py: 0.5 }}>
              <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                <Chip
                  size="small"
                  color={chipColor}
                  label={inv.is_paid ? t("clients.paid") : invoiceStatusLabel(inv.status)}
                />
                {inv.amount != null && inv.amount !== "" ? (
                  <Typography variant="body2">{formatMoney(inv.amount, cur, loc)}</Typography>
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {inv.reference ? `${inv.reference} · ` : ""}
                {inv.due_date
                  ? `${t("clients.due")} ${dayjs(inv.due_date).format("MMM D")}`
                  : t("clients.noDueDate")}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "account",
        headerName: t("clients.account"),
        width: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const st = String(row.status ?? "active");
          const roster =
            st === "inactive"
              ? t("clients.roster.inactive")
              : st === "archived"
                ? t("clients.roster.archived")
                : t("clients.roster.active");
          const ac = String(row.account_status ?? "");
          const acKnown = ["good_standing", "payment_issue", "onboarding", "churned"].includes(ac);
          const acLabel = acKnown ? t(`clients.accountStatus.${ac}` as never) : ac;
          return (
            <Stack direction="column" spacing={0.5} sx={{ py: 0.5 }}>
              <Chip size="small" color={rosterChipColor[st] ?? "default"} label={roster} />
              <Chip size="small" color={accountChipColor[ac] ?? "default"} label={acLabel} />
            </Stack>
          );
        },
      },
      {
        field: "actions",
        headerName: t("clients.actions"),
        width: 220,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
            <MuiLink component={Link} to={`/clients/show/${row.id}#invoices`} variant="body2">
              {t("actions.financial")}
            </MuiLink>
            <EditButton resource="clients" hideText size="small" recordItemId={row.id} />
            <ShowButton resource="clients" hideText size="small" recordItemId={row.id} />
            <DeleteButton resource="clients" hideText size="small" recordItemId={row.id} />
          </Stack>
        ),
      },
    ];

  return (
    <List headerButtons={<CreateButton />}>
      <Box sx={{ width: "100%", overflow: "auto" }}>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          getRowId={(row) => String(row.id)}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>
    </List>
  );
}
