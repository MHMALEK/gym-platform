import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { DeleteButton, List, useDataGrid } from "@refinedev/mui";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";

export function NutritionTemplateList() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [assignTarget, setAssignTarget] = useState<{ id: number; name: string } | null>(null);
  const { dataGridProps, setFilters } = useDataGrid({
    resource: "nutrition-templates",
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

  const columns: GridColDef<BaseRecord>[] = [
    { field: "name", headerName: t("nutritionTemplates.list.name"), flex: 1, minWidth: 160 },
    { field: "description", headerName: t("nutritionTemplates.list.description"), flex: 1, minWidth: 140 },
    {
      field: "meal_count",
      headerName: t("nutritionTemplates.list.meals"),
      width: 100,
      renderCell: ({ value }) => (value as number) ?? 0,
    },
    {
      field: "source_catalog_template_id",
      headerName: t("nutritionTemplates.list.fromCatalog"),
      width: 120,
      renderCell: ({ value }) => value ?? t("common.dash"),
    },
    {
      field: "actions",
      headerName: t("nutritionTemplates.list.actions"),
      width: 340,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap alignItems="center">
          <Button component={Link} to={`/nutrition-templates/edit/${row.id}`} variant="contained" size="small">
            {t("actions.edit")}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              setAssignTarget({ id: Number(row.id), name: String((row as BaseRecord).name ?? "") })
            }
          >
            {t("assignPlanToClients.assignToClientsButton")}
          </Button>
          <DeleteButton size="small" recordItemId={row.id}>
            {t("actions.delete")}
          </DeleteButton>
        </Stack>
      ),
    },
  ];

  return (
    <List title={t("nutritionTemplates.list.pageTitle")}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Typography variant="body2" color="text.secondary">
          {t("nutritionTemplates.list.intro")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between">
          <TextField
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("nutritionTemplates.list.searchPlaceholder")}
            sx={{ minWidth: 220, maxWidth: 400, flex: "1 1 220px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch(q);
            }}
          />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button component={Link} to="/nutrition-templates/create" variant="contained" startIcon={<AddIcon />}>
              {t("nutritionTemplates.list.addButton")}
            </Button>
            <Button component={Link} to="/library/nutrition-templates" variant="outlined">
              {t("nutritionTemplates.list.openCatalog")}
            </Button>
          </Stack>
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
        <AssignPlanToClientsDialog
          open={assignTarget != null}
          onClose={() => setAssignTarget(null)}
          mode="nutrition"
          resourceId={assignTarget?.id ?? 0}
          resourceName={assignTarget?.name}
        />
      </Stack>
    </List>
  );
}
