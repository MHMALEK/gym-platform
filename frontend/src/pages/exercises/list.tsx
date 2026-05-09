import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type BaseRecord, useList } from "@refinedev/core";
import { CreateButton, DeleteButton, EditButton, List, useDataGrid } from "@refinedev/mui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ExerciseLibraryCards } from "../../components/ExerciseLibraryCards";
import type { ExerciseRecord } from "../../types/exercise";

export function ExerciseList() {
  const { t } = useTranslation();
  const { dataGridProps, setFilters } = useDataGrid({
    resource: "exercises",
    syncWithLocation: true,
  });
  const [q, setQ] = useState("");
  const [venue, setVenue] = useState<string | undefined>();
  const [category, setCategory] = useState("");
  const [equipment, setEquipment] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("");
  const { data: muscleGroups } = useList<BaseRecord>({
    resource: "directory-muscle-groups",
    pagination: { pageSize: 200, mode: "server" },
  });

  const applyFilters = useCallback(
    (nextQ: string, nextVenue?: string, nextCategory = category, nextEquipment = equipment, nextMuscle = muscleGroupId) => {
      const f: { field: string; operator: "eq"; value: string }[] = [];
      if (nextQ.trim()) f.push({ field: "q", operator: "eq", value: nextQ.trim() });
      if (nextVenue) f.push({ field: "venue_type", operator: "eq", value: nextVenue });
      if (nextCategory.trim()) f.push({ field: "category", operator: "eq", value: nextCategory.trim() });
      if (nextEquipment.trim()) f.push({ field: "equipment", operator: "eq", value: nextEquipment.trim() });
      if (nextMuscle) f.push({ field: "muscle_group_id", operator: "eq", value: nextMuscle });
      setFilters(f, "replace");
    },
    [category, equipment, muscleGroupId, setFilters],
  );

  const venueFilterOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  const rows = ((dataGridProps.rows ?? []) as BaseRecord[]).map((row) => row as ExerciseRecord);

  return (
    <List headerButtons={<CreateButton />}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Typography variant="body2" color="text.secondary">
          {t("exercises.list.intro")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ flex: 1 }}>
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
            <TextField
              size="small"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(q, venue);
              }}
              sx={{ width: 150 }}
            />
            <TextField
              size="small"
              label="Equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(q, venue);
              }}
              sx={{ width: 160 }}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="ex-muscle-filter">Muscle</InputLabel>
              <Select
                labelId="ex-muscle-filter"
                label="Muscle"
                value={muscleGroupId}
                onChange={(e) => {
                  const next = e.target.value;
                  setMuscleGroupId(next);
                  applyFilters(q, venue, category, equipment, next);
                }}
              >
                <MenuItem value="">
                  <em>{t("common.dash")}</em>
                </MenuItem>
                {(muscleGroups?.data ?? []).map((row) => (
                  <MenuItem key={row.id as number} value={String(row.id)}>
                    {String(row.label)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => applyFilters(q, venue)}>
              Apply
            </Button>
          </Stack>
          <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
        </Stack>
        <ExerciseLibraryCards
          rows={rows}
          emptyText={t("exercises.list.empty")}
          action={(exercise) => (
            <Stack direction="row" spacing={0.5}>
              <EditButton hideText size="small" recordItemId={exercise.id} />
              <DeleteButton hideText size="small" recordItemId={exercise.id} />
            </Stack>
          )}
        />
      </Stack>
    </List>
  );
}
