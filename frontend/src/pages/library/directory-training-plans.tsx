import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { List, useDataGrid } from "@refinedev/mui";
import { useTranslation } from "react-i18next";

import { useAppMessage } from "../../lib/useAppMessage";
import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryTrainingPlansPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const { dataGridProps, tableQueryResult } = useDataGrid({
    resource: "directory-training-plans",
    syncWithLocation: true,
  });

  const copy = async (id: number) => {
    const res = await fetch(`${apiPrefix}/training-plans/from-catalog/${id}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("library.copied"));
    void tableQueryResult.refetch();
  };

  const columns: GridColDef<BaseRecord>[] = [
    { field: "name", headerName: t("library.name"), flex: 1, minWidth: 160 },
    { field: "description", headerName: t("library.description"), flex: 1, minWidth: 140 },
    {
      field: "actions",
      headerName: "",
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Button size="small" onClick={() => void copy(Number(row.id))}>
          {t("library.copyToMine")}
        </Button>
      ),
    },
  ];

  return (
    <List title={t("library.plansTitle")} breadcrumb={false}>
      <Box sx={{ width: "100%" }}>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          getRowId={(r) => r.id as string | number}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Box>
    </List>
  );
}
