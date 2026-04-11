import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  dayTotals,
  type DietFoodLine,
  type DietMeal,
  MACRO_CHART_COLORS,
  macroPieSlices,
  mealCalorieRows,
  mealTotals,
} from "../lib/nutritionTotals";

export type { DietFoodLine, DietMeal };

type FoodRow = DietFoodLine & { _i: number };

type NutritionMealsEditorProps = {
  meals: DietMeal[];
  onChange: (next: DietMeal[]) => void;
};

function emptyFood(): DietFoodLine {
  return {
    description: "",
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
  };
}

export function NutritionMealsEditor({ meals, onChange }: NutritionMealsEditorProps) {
  const { t } = useTranslation();

  const setMeals = (next: DietMeal[]) => {
    onChange(next.map((m, idx) => ({ ...m, sort_order: idx })));
  };

  const addMeal = () => {
    const n = meals.length + 1;
    setMeals([
      ...meals,
      {
        sort_order: meals.length,
        name: t("nutrition.defaultMealName", { n }),
        notes: null,
        foods: [emptyFood()],
      },
    ]);
  };

  const removeMeal = (mi: number) => {
    setMeals(meals.filter((_, i) => i !== mi));
  };

  const moveMeal = (mi: number, dir: -1 | 1) => {
    const j = mi + dir;
    if (j < 0 || j >= meals.length) return;
    const copy = [...meals];
    const tmp = copy[mi];
    copy[mi] = copy[j]!;
    copy[j] = tmp!;
    setMeals(copy);
  };

  const patchMeal = (mi: number, patch: Partial<DietMeal>) => {
    setMeals(meals.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  };

  const addFood = (mi: number) => {
    const m = meals[mi];
    if (!m) return;
    patchMeal(mi, { foods: [...(m.foods ?? []), emptyFood()] });
  };

  const removeFood = (mi: number, fi: number) => {
    const m = meals[mi];
    if (!m) return;
    const foods = (m.foods ?? []).filter((_, i) => i !== fi);
    patchMeal(mi, { foods: foods.length ? foods : [emptyFood()] });
  };

  const patchFood = (mi: number, fi: number, patch: Partial<DietFoodLine>) => {
    const m = meals[mi];
    if (!m) return;
    const foods = (m.foods ?? []).map((f, i) => (i === fi ? { ...f, ...patch } : f));
    patchMeal(mi, { foods });
  };

  const day = useMemo(() => dayTotals(meals), [meals]);
  const macroSlices = useMemo(
    () =>
      macroPieSlices(day, {
        protein: t("nutrition.macroProtein"),
        carbs: t("nutrition.macroCarbs"),
        fat: t("nutrition.macroFat"),
      }),
    [day, t],
  );
  const mealBars = useMemo(() => {
    const rows = mealCalorieRows(meals).filter((r) => r.kcal > 0);
    return rows.map((r) => ({ ...r, name: r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name }));
  }, [meals]);

  const macroKcalTotal = macroSlices.reduce((s, x) => s + x.value, 0);
  const showMacroPie = macroKcalTotal > 0;
  const showMealChart = mealBars.length > 0;

  const fmt = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : 0).toLocaleString();

  const overviewRows = meals.map((m, i) => {
    const mt = mealTotals(m);
    return {
      key: String(i),
      name: m.name,
      kcal: mt.kcal,
      p: mt.protein_g,
      c: mt.carbs_g,
      f: mt.fat_g,
    };
  });

  return (
    <div>
      <Typography variant="h6" sx={{ mt: 0, mb: 1 }}>
        {t("nutrition.builderTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t("nutrition.builderHint")}
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={addMeal}>
              {t("nutrition.addMeal")}
            </Button>

            {meals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("nutrition.emptyMeals")}
              </Typography>
            ) : null}

            {meals.map((meal, mi) => (
              <MealCard
                key={mi}
                meal={meal}
                canUp={mi > 0}
                canDown={mi < meals.length - 1}
                t={t}
                onName={(v) => patchMeal(mi, { name: v })}
                onNotes={(v) => patchMeal(mi, { notes: v || null })}
                onAddFood={() => addFood(mi)}
                onRemoveMeal={() => removeMeal(mi)}
                onMoveUp={() => moveMeal(mi, -1)}
                onMoveDown={() => moveMeal(mi, 1)}
                onRemoveFood={(fi) => removeFood(mi, fi)}
                onPatchFood={(fi, patch) => patchFood(mi, fi, patch)}
              />
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card variant="outlined" sx={{ position: "sticky", top: 16 }}>
            <CardHeader title={t("nutrition.dayOverview")} />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography fontWeight={600}>{t("nutrition.wholeDay")}</Typography>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("nutrition.totalKcal")}
                      </Typography>
                      <Typography variant="h6">{fmt(day.kcal)}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("nutrition.gramsSummary")}
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {fmt(day.protein_g)} · {fmt(day.carbs_g)} · {fmt(day.fat_g)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography fontWeight={600} gutterBottom>
                    {t("nutrition.perMealReport")}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t("nutrition.colMeal")}</TableCell>
                          <TableCell align="right" width={72}>
                            {t("nutrition.colKcal")}
                          </TableCell>
                          <TableCell align="right" width={48}>
                            P
                          </TableCell>
                          <TableCell align="right" width={48}>
                            C
                          </TableCell>
                          <TableCell align="right" width={48}>
                            F
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {overviewRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary">
                                {t("nutrition.noMealsYet")}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          overviewRows.map((r) => (
                            <TableRow key={r.key}>
                              <TableCell sx={{ maxWidth: 160 }}>{r.name}</TableCell>
                              <TableCell align="right">{fmt(r.kcal)}</TableCell>
                              <TableCell align="right">{fmt(r.p)}</TableCell>
                              <TableCell align="right">{fmt(r.c)}</TableCell>
                              <TableCell align="right">{fmt(r.f)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box>
                  <Typography fontWeight={600}>{t("nutrition.chartsTitle")}</Typography>
                  {showMacroPie ? (
                    <Box sx={{ width: "100%", height: 240, mt: 1 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={macroSlices}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {macroSlices.map((s) => (
                              <Cell key={s.key} fill={s.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number | undefined) => [`${fmt(v ?? 0)} kcal`, t("nutrition.kcal")]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t("nutrition.macroPieHint")}
                    </Typography>
                  )}

                  {showMealChart ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        {t("nutrition.mealKcalChartTitle")}
                      </Typography>
                      <Box sx={{ width: "100%", height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mealBars} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={56} />
                            <YAxis tick={{ fontSize: 11 }} width={40} />
                            <Tooltip formatter={(v: number | undefined) => [`${fmt(v ?? 0)} kcal`, t("nutrition.kcal")]} />
                            <Bar dataKey="kcal" name={t("nutrition.kcal")} radius={[4, 4, 0, 0]}>
                              {mealBars.map((_, i) => (
                                <Cell key={mealBars[i]!.key} fill={MACRO_CHART_COLORS.meal[i % MACRO_CHART_COLORS.meal.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  ) : day.kcal > 0 && meals.length > 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t("nutrition.mealBarHint")}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}

type MealCardProps = {
  meal: DietMeal;
  canUp: boolean;
  canDown: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
  onName: (v: string) => void;
  onNotes: (v: string) => void;
  onAddFood: () => void;
  onRemoveMeal: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveFood: (fi: number) => void;
  onPatchFood: (fi: number, patch: Partial<DietFoodLine>) => void;
};

function MealCard({
  meal,
  canUp,
  canDown,
  t,
  onName,
  onNotes,
  onAddFood,
  onRemoveMeal,
  onMoveUp,
  onMoveDown,
  onRemoveFood,
  onPatchFood,
}: MealCardProps) {
  const dataSource: FoodRow[] = (meal.foods ?? []).map((f, i) => ({ ...f, _i: i }));
  const mt = mealTotals(meal);

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <TextField
            value={meal.name}
            onChange={(e) => onName(e.target.value)}
            variant="standard"
            fullWidth
            sx={{ "& .MuiInput-input": { fontWeight: 600, fontSize: "1rem" } }}
          />
        }
        action={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" disabled={!canUp} onClick={onMoveUp} aria-label="up">
              <KeyboardArrowUpIcon />
            </IconButton>
            <IconButton size="small" disabled={!canDown} onClick={onMoveDown} aria-label="down">
              <KeyboardArrowDownIcon />
            </IconButton>
            <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={onRemoveMeal}>
              {t("nutrition.removeMeal")}
            </Button>
          </Stack>
        }
      />
      <CardContent>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {t("nutrition.mealSubtotal", {
            kcal: Math.round(mt.kcal * 10) / 10,
            p: Math.round(mt.protein_g * 10) / 10,
            c: Math.round(mt.carbs_g * 10) / 10,
            f: Math.round(mt.fat_g * 10) / 10,
          })}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "32%" }}>{t("nutrition.colDescription")}</TableCell>
                <TableCell align="right" width={88}>
                  {t("nutrition.colKcal")}
                </TableCell>
                <TableCell align="right" width={72}>
                  {t("nutrition.colProteinShort")}
                </TableCell>
                <TableCell align="right" width={72}>
                  {t("nutrition.colCarbsShort")}
                </TableCell>
                <TableCell align="right" width={72}>
                  {t("nutrition.colFatShort")}
                </TableCell>
                <TableCell align="center" width={48}>
                  {t("nutrition.colActions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dataSource.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t("nutrition.emptyFoods")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                dataSource.map((row) => (
                  <TableRow key={row._i}>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.description}
                        placeholder={t("nutrition.foodDescriptionPh")}
                        onChange={(e) => onPatchFood(row._i, { description: e.target.value })}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0 }}
                        sx={{ width: "100%", minWidth: 72 }}
                        placeholder="—"
                        value={row.calories ?? ""}
                        onChange={(e) =>
                          onPatchFood(row._i, {
                            calories: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0 }}
                        sx={{ width: "100%", minWidth: 64 }}
                        placeholder="—"
                        value={row.protein_g ?? ""}
                        onChange={(e) =>
                          onPatchFood(row._i, {
                            protein_g: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0 }}
                        sx={{ width: "100%", minWidth: 64 }}
                        placeholder="—"
                        value={row.carbs_g ?? ""}
                        onChange={(e) =>
                          onPatchFood(row._i, {
                            carbs_g: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0 }}
                        sx={{ width: "100%", minWidth: 64 }}
                        placeholder="—"
                        value={row.fat_g ?? ""}
                        onChange={(e) =>
                          onPatchFood(row._i, {
                            fat_g: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={t("nutrition.removeFood")}
                        onClick={() => onRemoveFood(row._i)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={onAddFood} sx={{ mt: 1 }}>
          {t("nutrition.addFood")}
        </Button>
        <TextField
          sx={{ mt: 1.5 }}
          fullWidth
          multiline
          minRows={2}
          value={meal.notes ?? ""}
          placeholder={t("nutrition.mealNotesPh")}
          onChange={(e) => onNotes(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}
