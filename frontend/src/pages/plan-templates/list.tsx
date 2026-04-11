import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { CreateButton, DeleteButton, EditButton, List, useDataGrid } from "@refinedev/mui";
import { useTranslation } from "react-i18next";

import { formatMoney } from "../../lib/money";

type Pt = {
  id: number;
  name: string;
  code?: string | null;
  duration_days: number;
  price?: number | string | null;
  discount_price?: number | string | null;
  currency?: string;
  image_url?: string | null;
  is_active?: boolean;
};

export function PlanTemplateList() {
  const { t, i18n } = useTranslation();
  const loc = i18n.language;
  const { dataGridProps } = useDataGrid<Pt>({ resource: "plan-templates", syncWithLocation: true });

  const columns: GridColDef<Pt>[] = [
    {
      field: "image_url",
      headerName: "",
      width: 56,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Avatar src={row.image_url || undefined} sx={{ width: 40, height: 40, bgcolor: "action.disabledBackground" }}>
          {(row.name || "?").slice(0, 1).toUpperCase()}
        </Avatar>
      ),
    },
    { field: "id", headerName: t("planTemplates.list.id"), width: 72 },
    {
      field: "code",
      headerName: t("planTemplates.list.code"),
      width: 120,
      renderCell: ({ value }) => (value as string) || t("common.dash"),
    },
    { field: "name", headerName: t("planTemplates.list.name"), flex: 1, minWidth: 160 },
    {
      field: "duration_days",
      headerName: t("planTemplates.list.duration"),
      width: 100,
      renderCell: ({ value }) => t("planTemplates.list.days", { n: value as number }),
    },
    {
      field: "pricing",
      headerName: t("planTemplates.list.pricing"),
      width: 200,
      sortable: false,
      renderCell: ({ row }) => {
        const cur = row.currency ?? "USD";
        const disc = row.discount_price != null && row.discount_price !== "";
        return (
          <Stack spacing={0}>
            {disc ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                  {formatMoney(row.price, cur, loc)}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatMoney(row.discount_price, cur, loc)}
                </Typography>
              </>
            ) : (
              <Typography variant="body2">{formatMoney(row.price, cur, loc)}</Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: "is_active",
      headerName: t("planTemplates.list.active"),
      width: 88,
      renderCell: ({ value }) => ((value as boolean) ? t("planTemplates.list.yes") : t("planTemplates.list.no")),
    },
    {
      field: "actions",
      headerName: t("planTemplates.list.actions"),
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <EditButton hideText size="small" recordItemId={row.id} />
          <DeleteButton hideText size="small" recordItemId={row.id} />
        </Stack>
      ),
    },
  ];

  return (
    <List headerButtons={<CreateButton />}>
      <Box sx={{ width: "100%" }}>
        <DataGrid
          {...dataGridProps}
          columns={columns as GridColDef<BaseRecord>[]}
          getRowId={(r) => (r as Pt).id}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Box>
    </List>
  );
}
