import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { CreateButton, DeleteButton, EditButton, List, useDataGrid } from "@refinedev/mui";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { apiPrefix, authBearerHeaders } from "../../lib/api";
import { downloadBlob } from "../../lib/downloadBlob";
import { useAppMessage } from "../../lib/useAppMessage";

const statusColor: Record<string, "warning" | "success" | "error" | "default"> = {
  pending: "warning",
  paid: "success",
  overdue: "error",
  cancelled: "default",
};

export function InvoiceList() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const { dataGridProps } = useDataGrid({ resource: "invoices", syncWithLocation: true });

  const exportCsv = async () => {
    try {
      const res = await fetch(`${apiPrefix}/invoices/export/csv`, { headers: authBearerHeaders() });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, "invoices.csv");
    } catch (e) {
      message.error(String(e));
    }
  };

  const columns: GridColDef<BaseRecord>[] = [
    {
      field: "client",
      headerName: t("invoices.list.client"),
      width: 180,
      sortable: false,
      valueGetter: (_, row) => (row as { client?: { name?: string } }).client?.name ?? t("common.dash"),
    },
    { field: "reference", headerName: t("invoices.list.reference"), width: 120 },
    {
      field: "amount",
      headerName: t("invoices.list.amount"),
      width: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const r = row as BaseRecord;
        return r.amount != null ? `${r.amount} ${r.currency ?? "USD"}` : t("common.dash");
      },
    },
    {
      field: "due_date",
      headerName: t("invoices.list.due"),
      width: 120,
      renderCell: ({ row }) => {
        const v = (row as BaseRecord).due_date as string | null | undefined;
        return v ? dayjs(v).format("MMM D, YYYY") : t("common.dash");
      },
    },
    {
      field: "status",
      headerName: t("invoices.list.status"),
      width: 110,
      renderCell: ({ row }) => {
        const v = String((row as BaseRecord).status ?? "");
        return (
          <Chip
            size="small"
            label={t(`invoices.status.${v}` as never)}
            color={statusColor[v] ?? "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "created_at",
      headerName: t("invoices.list.created"),
      width: 120,
      renderCell: ({ row }) => dayjs(String((row as BaseRecord).created_at)).format("MMM D, YYYY"),
    },
    {
      field: "actions",
      headerName: t("invoices.list.actions"),
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={t("invoices.list.pdf")}>
            <IconButton
              size="small"
              aria-label={t("invoices.list.pdf")}
              onClick={async () => {
                try {
                  const res = await fetch(`${apiPrefix}/invoices/${row.id}/pdf`, {
                    headers: authBearerHeaders(),
                  });
                  if (!res.ok) {
                    message.error(await res.text());
                    return;
                  }
                  const blob = await res.blob();
                  const ref = (row as BaseRecord).reference as string | undefined;
                  downloadBlob(blob, `${ref || `invoice-${row.id}`}.pdf`);
                } catch (e) {
                  message.error(String(e));
                }
              }}
            >
              <PictureAsPdfIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <EditButton hideText size="small" recordItemId={row.id} />
          <DeleteButton hideText size="small" recordItemId={row.id} />
        </Stack>
      ),
    },
  ];

  return (
    <List
      headerButtons={
        <>
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={() => void exportCsv()}>
            {t("invoices.list.exportCsv")}
          </Button>
          <CreateButton />
        </>
      }
    >
      <DataGrid
        {...dataGridProps}
        columns={columns}
        getRowId={(row) => row.id as string | number}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        sx={{ minWidth: 960 }}
      />
    </List>
  );
}
