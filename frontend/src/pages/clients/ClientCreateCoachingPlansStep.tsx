import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type BaseRecord, useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** Final create-client step: browse workout & nutrition libraries and open create pages — no inline builder. */
export function ClientCreateCoachingPlansStep() {
  const { t } = useTranslation();
  const [nutritionTemplateFilter, setNutritionTemplateFilter] = useState("");
  const [trainingPlanFilter, setTrainingPlanFilter] = useState("");
  const [tpPage, setTpPage] = useState(0);
  const [ntPage, setNtPage] = useState(0);
  const rowsPerPage = 8;

  const { data: trainingPlanList, isLoading: trainingPlansLoading } = useList({
    resource: "training-plans",
    pagination: { current: 1, pageSize: 500 },
  });
  const trainingPlanRows = useMemo(() => {
    const raw = (trainingPlanList?.data ?? []) as BaseRecord[];
    const q = trainingPlanFilter.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => String(r.name ?? "").toLowerCase().includes(q));
  }, [trainingPlanList?.data, trainingPlanFilter]);
  const trainingPlansTotalCount = trainingPlanList?.data?.length ?? 0;

  const { data: nutritionTemplateList, isLoading: nutritionTemplatesLoading } = useList({
    resource: "nutrition-templates",
    pagination: { current: 1, pageSize: 500 },
  });
  const nutritionTemplateRows = useMemo(() => {
    const raw = (nutritionTemplateList?.data ?? []) as BaseRecord[];
    const q = nutritionTemplateFilter.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => String(r.name ?? "").toLowerCase().includes(q));
  }, [nutritionTemplateList?.data, nutritionTemplateFilter]);
  const nutritionTemplatesTotalCount = nutritionTemplateList?.data?.length ?? 0;

  const sectionCardClass = "client-section-card client-section-card--editable";

  const tpSlice = trainingPlanRows.slice(tpPage * rowsPerPage, tpPage * rowsPerPage + rowsPerPage);
  const ntSlice = nutritionTemplateRows.slice(ntPage * rowsPerPage, ntPage * rowsPerPage + rowsPerPage);

  const tpEmpty =
    trainingPlansTotalCount === 0
      ? t("clients.plans.workoutTemplateEmptyList")
      : trainingPlanFilter.trim()
        ? t("clients.plans.workoutTemplateFilterEmpty")
        : t("clients.plans.workoutTemplateEmptyList");

  const ntEmpty =
    nutritionTemplatesTotalCount === 0
      ? t("clients.plans.templateEmptyList")
      : nutritionTemplateFilter.trim()
        ? t("clients.plans.templateFilterEmpty")
        : t("clients.plans.templateEmptyList");

  return (
    <Card variant="outlined" className={sectionCardClass}>
      <CardHeader title={t("clients.plans.pageTitle")} />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 13, lineHeight: 1.55 }}>
          {t("clients.wizard.stepWorkoutDietHint")}
        </Typography>

        <Typography variant="h6" sx={{ mt: 0, mb: 1 }}>
          {t("clients.plans.workoutTemplatesSectionTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("clients.wizard.workoutDietBrowseWorkoutsHint")}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Button component={Link} to="/training-plans/create" variant="contained">
            {t("clients.plans.newWorkoutPlan")}
          </Button>
        </Box>
        <Stack spacing={2} sx={{ width: "100%", mb: 3 }}>
          <TextField
            size="small"
            placeholder={t("clients.plans.filterWorkoutPlansPlaceholder")}
            value={trainingPlanFilter}
            onChange={(e) => {
              setTrainingPlanFilter(e.target.value);
              setTpPage(0);
            }}
            sx={{ maxWidth: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("trainingPlans.list.name")}</TableCell>
                  <TableCell>{t("trainingPlans.list.description")}</TableCell>
                  <TableCell width={140}>{t("trainingPlans.list.venue")}</TableCell>
                  <TableCell width={100} align="center">
                    {t("actions.edit")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainingPlansLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>{t("common.loading", { defaultValue: "…" })}</TableCell>
                  </TableRow>
                ) : tpSlice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>{tpEmpty}</TableCell>
                  </TableRow>
                ) : (
                  tpSlice.map((r) => (
                    <TableRow key={String(r.id)}>
                      <TableCell>{String(r.name ?? "")}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>{String(r.description ?? "")}</TableCell>
                      <TableCell>{t(`workouts.venue.${String(r.venue_type ?? "mixed")}`)}</TableCell>
                      <TableCell align="center">
                        <Button component={Link} to={`/training-plans/edit/${r.id}`} size="small">
                          {t("actions.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={trainingPlanRows.length}
            page={tpPage}
            onPageChange={(_, p) => setTpPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            onRowsPerPageChange={() => {}}
          />
        </Stack>

        <Typography variant="h6" sx={{ mt: 0, mb: 1 }}>
          {t("clients.plans.templatesSectionTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("clients.wizard.workoutDietBrowseNutritionHint")}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Button component={Link} to="/nutrition-templates/create" variant="contained">
            {t("clients.plans.newTemplate")}
          </Button>
        </Box>
        <Stack spacing={2} sx={{ width: "100%" }}>
          <TextField
            size="small"
            placeholder={t("clients.plans.filterTemplatesPlaceholder")}
            value={nutritionTemplateFilter}
            onChange={(e) => {
              setNutritionTemplateFilter(e.target.value);
              setNtPage(0);
            }}
            sx={{ maxWidth: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("nutritionTemplates.list.name")}</TableCell>
                  <TableCell width={88}>{t("nutritionTemplates.list.meals")}</TableCell>
                  <TableCell width={100} align="center">
                    {t("actions.edit")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nutritionTemplatesLoading ? (
                  <TableRow>
                    <TableCell colSpan={3}>{t("common.loading", { defaultValue: "…" })}</TableCell>
                  </TableRow>
                ) : ntSlice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>{ntEmpty}</TableCell>
                  </TableRow>
                ) : (
                  ntSlice.map((r) => (
                    <TableRow key={String(r.id)}>
                      <TableCell>{String(r.name ?? "")}</TableCell>
                      <TableCell>{Number(r.meal_count ?? 0)}</TableCell>
                      <TableCell align="center">
                        <Button component={Link} to={`/nutrition-templates/edit/${r.id}`} size="small">
                          {t("actions.edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={nutritionTemplateRows.length}
            page={ntPage}
            onPageChange={(_, p) => setNtPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            onRowsPerPageChange={() => {}}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
