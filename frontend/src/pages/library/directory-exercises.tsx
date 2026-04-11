import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useInvalidate } from "@refinedev/core";
import { type BaseRecord } from "@refinedev/core";
import { List, useDataGrid } from "@refinedev/mui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAppMessage } from "../../lib/useAppMessage";
import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryExercisesPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const invalidate = useInvalidate();
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [venue, setVenue] = useState<string | undefined>();
  const { dataGridProps, setFilters } = useDataGrid({
    resource: "directory-exercises",
    syncWithLocation: true,
  });

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

  const copyToMine = useCallback(
    async (id: number) => {
      setCopyingId(id);
      try {
        const res = await fetch(`${apiPrefix}/exercises/from-directory/${id}`, {
          method: "POST",
          headers: authHeaders(),
          body: "{}",
        });
        if (!res.ok) {
          message.error((await res.text()) || t("library.copyExerciseError"));
          return;
        }
        message.success(t("library.copyExerciseSuccess"));
        await invalidate({ resource: "exercises", invalidates: ["list"] });
      } catch {
        message.error(t("library.copyExerciseError"));
      } finally {
        setCopyingId(null);
      }
    },
    [invalidate, message, t],
  );

  const columns: GridColDef<BaseRecord>[] = [
    { field: "name", headerName: t("library.name"), flex: 1, minWidth: 140 },
    { field: "category", headerName: t("library.category"), width: 120 },
    {
      field: "venue_type",
      headerName: t("library.venueColumn"),
      width: 140,
      renderCell: ({ value }) => t(`workouts.venue.${(value as string) ?? "both"}`),
    },
    {
      field: "muscle_groups",
      headerName: t("library.muscles"),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => {
        const m = row.muscle_groups as { label?: string }[] | undefined;
        if (m?.length) return m.map((x) => x.label).filter(Boolean).join(", ");
        return "—";
      },
    },
    { field: "equipment", headerName: t("library.equipment"), width: 120 },
    { field: "description", headerName: t("library.description"), flex: 1, minWidth: 120 },
    {
      field: "actions",
      headerName: t("library.actions"),
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Button
          variant="contained"
          size="small"
          disabled={copyingId === Number(row.id)}
          onClick={() => void copyToMine(Number(row.id))}
        >
          {t("library.copyExerciseToMine")}
        </Button>
      ),
    },
  ];

  return (
    <List title={t("library.exercisesTitle")} breadcrumb={false}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Alert severity="info">
          <AlertTitle>{t("library.catalogIntroTitle")}</AlertTitle>
          {t("library.catalogIntroBody")}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {t("library.readOnlyHint")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
            <TextField
              size="small"
              placeholder={t("library.searchCatalog")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(q, venue);
              }}
              sx={{ maxWidth: 360 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="dir-ex-venue">{t("library.filterVenue")}</InputLabel>
              <Select
                labelId="dir-ex-venue"
                label={t("library.filterVenue")}
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
                  <em>—</em>
                </MenuItem>
                {venueFilterOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Link to="/exercises">{t("library.goToMyExercises")}</Link>
        </Stack>
        <Box sx={{ width: "100%" }}>
          <DataGrid
            {...dataGridProps}
            columns={columns}
            getRowId={(r) => r.id as string | number}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: t("library.catalogEmpty") }}
          />
        </Box>
      </Stack>
    </List>
  );
}
