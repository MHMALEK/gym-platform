import AddIcon from "@mui/icons-material/AddRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import GroupsIcon from "@mui/icons-material/GroupsRounded";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongRounded";
import WarningAmberIcon from "@mui/icons-material/WarningAmberRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useList } from "@refinedev/core";
import type { BaseRecord } from "@refinedev/core";
import dayjs from "dayjs";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageHeader } from "../../components/layout/PageHeader";
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
  if (inv?.status === "overdue" || (inv?.status === "pending" && inv.due_date)) {
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

  const stats = useMemo(() => {
    let active = 0;
    let pending = 0;
    let overdue = 0;
    for (const r of clients) {
      const status = String(r.status ?? "active");
      if (status === "active") active += 1;
      const inv = lastInvoiceSummary(r);
      if (inv) {
        if (invoiceIsOverdue(inv, today)) overdue += 1;
        else if (inv.status === "pending") pending += 1;
      }
    }
    return { total: clients.length, active, pending, overdue };
  }, [clients, today]);

  function invoiceStatusLabel(status: string): string {
    const key = `invoices.status.${status}` as const;
    const tr = t(key);
    return tr === key ? status : tr;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader
        title={t("coachDesk.title")}
        subtitle={t("coachDesk.subtitle")}
        actions={
          <>
            <Button
              component={Link}
              to="/clients"
              size="small"
              variant="text"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{ color: "text.secondary" }}
            >
              {t("coachDesk.viewClients")}
            </Button>
            <Button
              component={Link}
              to="/clients/create"
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              disableElevation
            >
              {t("clients.addClient") !== "clients.addClient"
                ? t("clients.addClient")
                : "New client"}
            </Button>
          </>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          mb: { xs: 2, md: 3 },
        }}
      >
        <StatCard
          icon={<GroupsIcon fontSize="small" />}
          label={t("coachDesk.statTotal") !== "coachDesk.statTotal" ? t("coachDesk.statTotal") : "Total clients"}
          value={stats.total}
        />
        <StatCard
          icon={<GroupsIcon fontSize="small" />}
          label={t("clients.roster.active")}
          value={stats.active}
          tone="success"
        />
        <StatCard
          icon={<ReceiptLongIcon fontSize="small" />}
          label={t("invoices.status.pending")}
          value={stats.pending}
          tone="warning"
        />
        <StatCard
          icon={<WarningAmberIcon fontSize="small" />}
          label={t("invoices.status.overdue")}
          value={stats.overdue}
          tone="error"
        />
      </Box>

      <Card
        variant="outlined"
        sx={{
          overflow: "hidden",
          borderRadius: 2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={0.25}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              {t("coachDesk.rosterHeading") !== "coachDesk.rosterHeading"
                ? t("coachDesk.rosterHeading")
                : "Client roster"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("coachDesk.rosterSubheading") !== "coachDesk.rosterSubheading"
                ? t("coachDesk.rosterSubheading")
                : "Sorted by what needs your attention next"}
            </Typography>
          </Stack>
        </Stack>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadSx}>{t("clients.client")}</TableCell>
                <TableCell sx={{ ...tableHeadSx, width: 130 }}>{t("coachDesk.colStatus")}</TableCell>
                <TableCell sx={{ ...tableHeadSx, minWidth: 220 }}>{t("coachDesk.colInvoice")}</TableCell>
                <TableCell sx={{ ...tableHeadSx, minWidth: 200 }}>{t("coachDesk.colDue")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      …
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ py: 4, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        {t("coachDesk.emptyRoster")}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                sortedClients.map((r) => (
                  <TableRow
                    key={String(r.id)}
                    hover
                    sx={{
                      "& td": {
                        borderColor: "divider",
                      },
                    }}
                  >
                    <TableCell>
                      <Box
                        component={Link}
                        to={`/clients/show/${r.id}`}
                        sx={{
                          textDecoration: "none",
                          color: "text.primary",
                          fontWeight: 600,
                          fontSize: 14,
                          "&:hover": { color: "primary.main" },
                        }}
                      >
                        {String(r.name ?? "")}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const st = String(r.status ?? "active");
                        const roster =
                          st === "inactive"
                            ? t("clients.roster.inactive")
                            : st === "archived"
                              ? t("clients.roster.archived")
                              : t("clients.roster.active");
                        const color =
                          st === "inactive" ? "warning" : st === "archived" ? "default" : "success";
                        return (
                          <Chip
                            size="small"
                            label={roster}
                            color={color as "default" | "success" | "warning"}
                            variant="outlined"
                            sx={{ fontWeight: 500, height: 22 }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const inv = lastInvoiceSummary(r);
                        if (!inv) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              {t("clients.noInvoices")}
                            </Typography>
                          );
                        }
                        const cur = inv.currency ?? "USD";
                        const overdue = invoiceIsOverdue(inv, today);
                        const tagColor = inv.is_paid
                          ? "success"
                          : overdue || inv.status === "overdue"
                            ? "error"
                            : inv.status === "pending"
                              ? "warning"
                              : "default";
                        const label = inv.is_paid
                          ? t("clients.paid")
                          : overdue
                            ? t("invoices.status.overdue")
                            : invoiceStatusLabel(inv.status);
                        return (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              label={label}
                              color={tagColor as "default" | "success" | "error" | "warning"}
                              sx={{ fontWeight: 500, height: 22 }}
                            />
                            {inv.amount != null && inv.amount !== "" ? (
                              <Typography variant="caption" color="text.secondary">
                                {formatMoney(inv.amount, cur, loc)}
                              </Typography>
                            ) : null}
                          </Stack>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const inv = lastInvoiceSummary(r);
                        const ms = membershipSummary(r);

                        if (inv && (inv.status === "pending" || inv.status === "overdue") && inv.due_date) {
                          const d = dayjs(inv.due_date).startOf("day");
                          const overdue = invoiceIsOverdue(inv, today);
                          return (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography
                                variant="body2"
                                color={overdue ? "error.main" : "text.primary"}
                                fontWeight={overdue ? 600 : 400}
                              >
                                {d.format("MMM D, YYYY")}
                              </Typography>
                              {overdue ? (
                                <Chip
                                  size="small"
                                  label={t("invoices.status.overdue")}
                                  color="error"
                                  sx={{ fontWeight: 500, height: 22 }}
                                />
                              ) : null}
                            </Stack>
                          );
                        }

                        if (inv?.status === "pending" && !inv.due_date) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              {t("clients.noDueDate")}
                            </Typography>
                          );
                        }

                        if (inv?.status === "overdue" && !inv.due_date) {
                          return (
                            <Chip
                              size="small"
                              label={t("invoices.status.overdue")}
                              color="error"
                              sx={{ fontWeight: 500, height: 22 }}
                            />
                          );
                        }

                        if (ms?.ends_at) {
                          const d = dayjs(ms.ends_at);
                          return (
                            <Typography variant="body2" color="text.secondary">
                              {t("coachDesk.dueMembershipEnds", { date: d.format("MMM D, YYYY") })}
                            </Typography>
                          );
                        }

                        return (
                          <Typography variant="body2" color="text.secondary">
                            {t("common.dash")}
                          </Typography>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Button component={Link} to="/invoices" size="small" variant="text" sx={{ color: "text.secondary" }}>
          {t("coachDesk.viewInvoices")}
        </Button>
        <Box sx={{ width: 1, height: 14, bgcolor: "divider" }} />
        <Button component={Link} to="/dashboard" size="small" variant="text" sx={{ color: "text.secondary" }}>
          {t("coachDesk.openDashboard")}
        </Button>
      </Stack>
    </Box>
  );
}

const tableHeadSx = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "text.secondary",
  borderColor: "divider",
};

type Tone = "default" | "success" | "warning" | "error";

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: ReactNode;
  value: number | string;
  tone?: Tone;
}) {
  const toneColor: Record<Tone, string> = {
    default: "text.secondary",
    success: "success.main",
    warning: "warning.main",
    error: "error.main",
  };

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: toneColor[tone] }}>
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            color: "inherit",
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
          color="text.secondary"
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: tone === "default" ? "text.primary" : toneColor[tone],
          lineHeight: 1.1,
        }}
      >
        {value}
      </Typography>
    </Card>
  );
}
