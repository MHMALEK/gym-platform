import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

import {
  apiClientInvoice,
  downloadClientInvoicePdf,
  type ClientPortalInvoice,
} from "../../../lib/clientPortalApi";
import { downloadBlob } from "../../../lib/downloadBlob";
import { formatMoney } from "../../../lib/money";
import { useAppMessage } from "../../../lib/useAppMessage";

const statusColor: Record<string, "warning" | "success" | "error" | "default"> = {
  pending: "warning",
  paid: "success",
  overdue: "error",
  cancelled: "default",
};

export function ClientInvoiceShowPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = id ? Number(id) : Number.NaN;
  const { t, i18n } = useTranslation();
  const message = useAppMessage();
  const [inv, setInv] = useState<ClientPortalInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(invoiceId)) return;
    let cancelled = false;
    setLoading(true);
    apiClientInvoice(invoiceId)
      .then((data) => {
        if (!cancelled) setInv(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) message.error(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId, message]);

  const onPdf = async () => {
    if (!inv) return;
    setPdfBusy(true);
    try {
      const blob = await downloadClientInvoicePdf(inv.id);
      downloadBlob(blob, `invoice-${inv.reference ?? inv.id}.pdf`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  if (!Number.isFinite(invoiceId)) {
    return (
      <Typography color="error">
        {t("clientPortal.invalidInvoice")}{" "}
        <Button component={RouterLink} to="/client/invoices">
          {t("clientPortal.backToInvoices")}
        </Button>
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!inv) {
    return (
      <Typography color="error">
        {t("clientPortal.invoiceNotFound")}{" "}
        <Button component={RouterLink} to="/client/invoices">
          {t("clientPortal.backToInvoices")}
        </Button>
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/client/invoices" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>
        {t("clientPortal.backToInvoices")}
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography variant="h5">{inv.reference ?? `#${inv.id}`}</Typography>
          <Chip size="small" sx={{ mt: 1 }} color={statusColor[inv.status] ?? "default"} label={inv.status} />
        </Box>
        <LoadingButton variant="outlined" startIcon={<PictureAsPdfIcon />} loading={pdfBusy} onClick={() => void onPdf()}>
          {t("clientPortal.downloadPdf")}
        </LoadingButton>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Row label={t("clientPortal.amount")} value={formatMoney(inv.amount, inv.currency, i18n.language)} />
            <Row
              label={t("clientPortal.due")}
              value={inv.due_date ? dayjs(inv.due_date).format("MMM D, YYYY") : t("clientPortal.noDueDate")}
            />
            {inv.paid_at ? (
              <Row label={t("clientPortal.paidAt")} value={dayjs(inv.paid_at).format("MMM D, YYYY HH:mm")} />
            ) : null}
            {inv.invoice_period_start || inv.invoice_period_end ? (
              <Row
                label={t("clientPortal.period")}
                value={`${inv.invoice_period_start ? dayjs(inv.invoice_period_start).format("MMM D, YYYY") : "—"} – ${inv.invoice_period_end ? dayjs(inv.invoice_period_end).format("MMM D, YYYY") : "—"}`}
              />
            ) : null}
            {inv.notes ? (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("clientPortal.notes")}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {inv.notes}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
