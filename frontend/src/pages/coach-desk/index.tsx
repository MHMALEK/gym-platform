import Box from "@mui/material/Box";
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

  function invoiceStatusLabel(status: string): string {
    const key = `invoices.status.${status}` as const;
    const tr = t(key);
    return tr === key ? status : tr;
  }

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto" }}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            {t("coachDesk.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("coachDesk.subtitle")}
          </Typography>
        </Box>

        <Card variant="outlined">
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 220 }}>{t("clients.client")}</TableCell>
                  <TableCell sx={{ width: 130 }}>{t("coachDesk.colStatus")}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>{t("coachDesk.colInvoice")}</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>{t("coachDesk.colDue")}</TableCell>
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
                      <Typography variant="body2" color="text.secondary">
                        {t("coachDesk.emptyRoster")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedClients.map((r) => (
                    <TableRow key={String(r.id)} hover>
                      <TableCell>
                        <Link to={`/clients/show/${r.id}`}>
                          <Typography fontWeight={600}>{String(r.name ?? "")}</Typography>
                        </Link>
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
                          return <Chip size="small" label={roster} color={color as "default" | "success" | "warning"} variant="outlined" />;
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
                            <Stack spacing={0.5}>
                              <Chip size="small" label={label} color={tagColor as "default" | "success" | "error" | "warning"} />
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
                              <Stack spacing={0.5}>
                                <Typography color={overdue ? "error" : "text.primary"} fontWeight={overdue ? 600 : 400}>
                                  {d.format("MMM D, YYYY")}
                                </Typography>
                                {overdue ? <Chip size="small" label={t("invoices.status.overdue")} color="error" /> : null}
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
                            return <Chip size="small" label={t("invoices.status.overdue")} color="error" />;
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

        <Typography variant="body2" color="text.secondary">
          <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
            <Link to="/clients">{t("coachDesk.viewClients")}</Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link to="/invoices">{t("coachDesk.viewInvoices")}</Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link to="/dashboard">{t("coachDesk.openDashboard")}</Link>
          </Stack>
        </Typography>
      </Stack>
    </Box>
  );
}
