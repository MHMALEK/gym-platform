import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { List, useDataGrid } from "@refinedev/mui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAppMessage } from "../../lib/useAppMessage";
import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryNutritionTemplatesPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [q, setQ] = useState("");
  const { dataGridProps, setFilters, tableQueryResult } = useDataGrid({
    resource: "directory-nutrition-templates",
    syncWithLocation: true,
  });

  const applySearch = useCallback(
    (nextQ: string) => {
      setFilters(
        nextQ.trim() ? [{ field: "q", operator: "eq", value: nextQ.trim() }] : [],
        "replace",
      );
    },
    [setFilters],
  );

  const copy = async (id: number) => {
    const res = await fetch(`${apiPrefix}/nutrition-templates/from-catalog/${id}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("library.copiedNutritionTemplates"));
    void tableQueryResult.refetch();
  };

  const columns: GridColDef<BaseRecord>[] = [
    { field: "name", headerName: t("library.name"), flex: 1, minWidth: 160 },
    { field: "description", headerName: t("library.description"), flex: 1, minWidth: 140 },
    { field: "meal_count", headerName: t("nutritionTemplates.list.meals"), width: 100 },
    {
      field: "actions",
      headerName: t("library.actions"),
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Button variant="contained" size="small" onClick={() => void copy(Number(row.id))}>
          {t("library.copyToMine")}
        </Button>
      ),
    },
  ];

  return (
    <List title={t("library.nutritionTemplatesTitle")} breadcrumb={false}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Typography variant="body2" color="text.secondary">
          {t("library.nutritionCatalogIntro")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between">
          <TextField
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("library.searchNutritionCatalog")}
            sx={{ minWidth: 220, maxWidth: 400, flex: "1 1 220px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch(q);
            }}
          />
          <Button component={Link} to="/nutrition-templates" variant="contained">
            {t("library.goToMyNutritionTemplates")}
          </Button>
        </Stack>
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
      </Stack>
    </List>
  );
}
