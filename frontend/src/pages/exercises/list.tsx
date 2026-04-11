import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import { CreateButton, DeleteButton, EditButton, List, useDataGrid } from "@refinedev/mui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ExerciseList() {
  const { t } = useTranslation();
  const { dataGridProps, setFilters } = useDataGrid({
    resource: "exercises",
    syncWithLocation: true,
  });
  const [q, setQ] = useState("");
  const [venue, setVenue] = useState<string | undefined>();

  const applyFilters = useCallback(
    (nextQ: string, nextVenue?: string) => {
      const f: { field: string; operator: "eq"; value: string }[] = [];
      if (nextQ.trim()) f.push({ field: "q", operator: "eq", value: nextQ.trim() });
      if (nextVenue) f.push({ field: "venue_type", operator: "eq", value: nextVenue });
      setFilters(f, "replace");
    },
    [setFilters],
  );

  const venueFilterOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  const columns: GridColDef<BaseRecord>[] = [
    { field: "name", headerName: t("exercises.list.name"), flex: 1, minWidth: 160 },
    { field: "category", headerName: t("exercises.list.category"), width: 140 },
    {
      field: "venue_type",
      headerName: t("exercises.list.venue"),
      width: 140,
      renderCell: ({ row }) => t(`workouts.venue.${(row as BaseRecord).venue_type ?? "both"}`),
    },
    {
      field: "muscle_groups",
      headerName: t("exercises.list.muscles"),
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }) => {
        const m = (row as BaseRecord).muscle_groups as { label?: string }[] | undefined;
        if (m?.length) return m.map((x) => x.label).filter(Boolean).join(", ");
        return "—";
      },
    },
    { field: "equipment", headerName: t("exercises.list.equipment"), width: 140 },
    {
      field: "actions",
      headerName: t("exercises.list.actions"),
      width: 120,
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
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Typography variant="body2" color="text.secondary">
          {t("exercises.list.intro")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
            <TextField
              size="small"
              placeholder={t("exercises.list.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(q, venue);
              }}
              sx={{ maxWidth: 360 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="ex-venue-filter">{t("exercises.list.filterVenue")}</InputLabel>
              <Select
                labelId="ex-venue-filter"
                label={t("exercises.list.filterVenue")}
                value={venue ?? ""}
                displayEmpty
                onChange={(e) => {
                  const v = e.target.value as string | undefined;
                  const next = v || undefined;
                  setVenue(next);
                  applyFilters(q, next);
                }}
              >
                <MenuItem value="">
                  <em>{t("common.dash")}</em>
                </MenuItem>
                {venueFilterOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
        </Stack>
        <Box sx={{ width: "100%" }}>
          <DataGrid
            {...dataGridProps}
            columns={columns}
            getRowId={(r) => r.id as string | number}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: t("exercises.list.empty") }}
          />
        </Box>
      </Stack>
    </List>
  );
}
