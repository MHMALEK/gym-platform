import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import {
  apiClientInvoices,
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

export function ClientInvoiceListPage() {
  const { t, i18n } = useTranslation();
  const message = useAppMessage();
  const [items, setItems] = useState<ClientPortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClientInvoices({ limit: 100 })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          message.error(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [message]);

  const onPdf = async (id: number, reference: string | null) => {
    try {
      const blob = await downloadClientInvoicePdf(id);
      downloadBlob(blob, `invoice-${reference ?? id}.pdf`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t("clientPortal.invoicesTitle")}</Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.noInvoices")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((inv) => (
            <Box
              key={inv.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Box
                component={RouterLink}
                to={`/client/invoices/${inv.id}`}
                sx={{ flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
              >
                <Typography fontWeight={600}>{inv.reference ?? `#${inv.id}`}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatMoney(inv.amount, inv.currency, i18n.language)}
                  {inv.due_date ? ` · ${t("clientPortal.due")} ${dayjs(inv.due_date).format("MMM D, YYYY")}` : ""}
                </Typography>
              </Box>
              <Chip size="small" color={statusColor[inv.status] ?? "default"} label={inv.status} />
              <Tooltip title={t("clientPortal.downloadPdf")}>
                <IconButton size="small" onClick={() => void onPdf(inv.id, inv.reference)}>
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
