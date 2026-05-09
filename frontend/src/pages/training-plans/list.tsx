import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { type BaseRecord } from "@refinedev/core";
import {
  CreateButton,
  DeleteButton,
  List,
  useDataGrid,
} from "@refinedev/mui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
import { trainingPlanPreviewPath } from "./preview";

export function TrainingPlanList() {
  const { t } = useTranslation();
  const [assignTarget, setAssignTarget] = useState<{ id: number; name: string } | null>(null);
  const { dataGridProps, setFilters, filters } = useDataGrid({ resource: "training-plans", syncWithLocation: true });
  const venueFilter = useMemo(
    () => (filters as { field?: string; value?: unknown }[] | undefined)?.find((f) => f.field === "venue_type")?.value as string | undefined,
    [filters],
  );

  const venueOptions = [
    { value: "", label: `${t("exercises.list.filterVenue")} —` },
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  const columns: GridColDef<BaseRecord>[] = [
    {
      field: "name",
      headerName: t("trainingPlans.list.name"),
      flex: 1,
      minWidth: 200,
      // Plan name is the primary affordance — clicking it opens the
      // editor. With auto-save, there's no separate "Build workout"
      // path; the editor is the only screen.
      renderCell: ({ row }) => (
        <Link
          to={`/training-plans/edit/${row.id}`}
          style={{ fontWeight: 500, textDecoration: "none" }}
        >
          {String((row as BaseRecord).name ?? "")}
        </Link>
      ),
    },
    { field: "description", headerName: t("trainingPlans.list.description"), flex: 1, minWidth: 140 },
    {
      field: "venue_type",
      headerName: t("trainingPlans.list.venue"),
      width: 140,
      renderCell: ({ row }) => t(`workouts.venue.${(row as BaseRecord).venue_type ?? "mixed"}`),
    },
    {
      field: "source_catalog_plan_id",
      headerName: t("trainingPlans.list.fromCatalog"),
      width: 120,
      renderCell: ({ row }) => {
        const v = (row as BaseRecord).source_catalog_plan_id;
        return v ?? t("common.dash");
      },
    },
    {
      field: "actions",
      headerName: t("trainingPlans.list.actions"),
      sortable: false,
      filterable: false,
      width: 320,
      renderCell: ({ row }) => (
        <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
          <Button
            component={Link}
            to={trainingPlanPreviewPath(row.id)}
            variant="outlined"
            size="small"
            sx={{ textTransform: "none" }}
          >
            Preview
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() =>
              setAssignTarget({
                id: Number(row.id),
                name: String((row as BaseRecord).name ?? ""),
              })
            }
            sx={{ textTransform: "none" }}
          >
            {t("assignPlanToClients.assignToClientsButton")}
          </Button>
          <DeleteButton hideText size="small" recordItemId={row.id} />
        </Stack>
      ),
    },
  ];

  return (
    <List headerButtons={<CreateButton />}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Alert severity="info">
          <AlertTitle>{t("trainingPlans.list.builderIntroTitle")}</AlertTitle>
          {t("trainingPlans.list.builderIntroBody")}
        </Alert>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="tp-venue-filter">{t("trainingPlans.list.venue")}</InputLabel>
          <Select
            labelId="tp-venue-filter"
            label={t("trainingPlans.list.venue")}
            value={venueFilter ?? ""}
            onChange={(e) => {
              const v = e.target.value as string;
              setFilters(v ? [{ field: "venue_type", operator: "eq", value: v }] : [], "replace");
            }}
          >
            {venueOptions.map((o) => (
              <MenuItem key={o.value || "all"} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
          mode="training"
          resourceId={assignTarget?.id ?? 0}
          resourceName={assignTarget?.name}
        />
      </Stack>
    </List>
  );
}
