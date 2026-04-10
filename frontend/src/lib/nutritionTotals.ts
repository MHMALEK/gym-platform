export type DietFoodLine = {
  description: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
};

export type DietMeal = {
  sort_order: number;
  name: string;
  notes?: string | null;
  foods: DietFoodLine[];
};

export type MealNutritionTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function n(v: number | null | undefined): number {
  if (v == null || Number.isNaN(Number(v))) return 0;
  return Number(v);
}

/** Atwater: protein & carbs 4 kcal/g, fat 9 kcal/g */
export function macroKcalFromGrams(
  protein_g?: number | null,
  carbs_g?: number | null,
  fat_g?: number | null,
): number {
  return n(protein_g) * 4 + n(carbs_g) * 4 + n(fat_g) * 9;
}

/** Prefer explicit calories; otherwise estimate from macros when possible */
export function lineEnergyKcal(line: DietFoodLine): number {
  const cal = line.calories;
  if (cal != null && !Number.isNaN(Number(cal))) {
    return Math.max(0, Number(cal));
  }
  return macroKcalFromGrams(line.protein_g, line.carbs_g, line.fat_g);
}

export function mealTotals(meal: DietMeal): MealNutritionTotals {
  let kcal = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  for (const f of meal.foods ?? []) {
    kcal += lineEnergyKcal(f);
    protein_g += n(f.protein_g);
    carbs_g += n(f.carbs_g);
    fat_g += n(f.fat_g);
  }
  return { kcal, protein_g, carbs_g, fat_g };
}

export function dayTotals(meals: DietMeal[]): MealNutritionTotals {
  let kcal = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  for (const m of meals) {
    const t = mealTotals(m);
    kcal += t.kcal;
    protein_g += t.protein_g;
    carbs_g += t.carbs_g;
    fat_g += t.fat_g;
  }
  return { kcal, protein_g, carbs_g, fat_g };
}

export type MacroPieSlice = { key: string; name: string; value: number; fill: string };

export const MACRO_CHART_COLORS = {
  protein: "#1677ff",
  carbs: "#52c41a",
  fat: "#faad14",
  meal: ["#1677ff", "#722ed1", "#13c2c2", "#eb2f96", "#fa8c16", "#2f54eb"],
} as const;

export function macroPieSlices(
  totals: MealNutritionTotals,
  labels: { protein: string; carbs: string; fat: string },
): MacroPieSlice[] {
  const p = n(totals.protein_g) * 4;
  const c = n(totals.carbs_g) * 4;
  const f = n(totals.fat_g) * 9;
  const out: MacroPieSlice[] = [];
  if (p > 0) out.push({ key: "p", name: labels.protein, value: p, fill: MACRO_CHART_COLORS.protein });
  if (c > 0) out.push({ key: "c", name: labels.carbs, value: c, fill: MACRO_CHART_COLORS.carbs });
  if (f > 0) out.push({ key: "f", name: labels.fat, value: f, fill: MACRO_CHART_COLORS.fat });
  return out;
}

export function mealCalorieRows(meals: DietMeal[]): { key: string; name: string; kcal: number }[] {
  return meals.map((m, i) => ({
    key: `meal-${i}`,
    name: m.name?.trim() || `Meal ${i + 1}`,
    kcal: mealTotals(m).kcal,
  }));
}

export function normalizeDietMealsForApi(meals: DietMeal[]): DietMeal[] {
  return meals.map((m, idx) => ({
    sort_order: idx,
    name: (m.name ?? "").trim() || "Meal",
    notes: m.notes?.trim() ? m.notes.trim() : null,
    foods: (m.foods ?? []).map((f) => ({
      description: (f.description ?? "").trim(),
      calories: f.calories != null && !Number.isNaN(Number(f.calories)) ? Number(f.calories) : null,
      protein_g: f.protein_g != null && !Number.isNaN(Number(f.protein_g)) ? Number(f.protein_g) : null,
      carbs_g: f.carbs_g != null && !Number.isNaN(Number(f.carbs_g)) ? Number(f.carbs_g) : null,
      fat_g: f.fat_g != null && !Number.isNaN(Number(f.fat_g)) ? Number(f.fat_g) : null,
    })),
  }));
}

function asNum(v: unknown): number | null {
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export function dietMealsFromApi(raw: unknown): DietMeal[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const rows = raw
    .map((item, idx) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const foodsRaw = o.foods;
      const foods: DietFoodLine[] = Array.isArray(foodsRaw)
        ? foodsRaw.map((fr) => {
            if (!fr || typeof fr !== "object") {
              return { description: "" };
            }
            const fl = fr as Record<string, unknown>;
            return {
              description: typeof fl.description === "string" ? fl.description : "",
              calories: asNum(fl.calories),
              protein_g: asNum(fl.protein_g),
              carbs_g: asNum(fl.carbs_g),
              fat_g: asNum(fl.fat_g),
            };
          })
        : [];
      return {
        sort_order: asNum(o.sort_order) ?? idx,
        name: typeof o.name === "string" ? o.name : "Meal",
        notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
        foods,
      };
    })
    .filter((x) => x != null) as DietMeal[];
  return [...rows].sort((a, b) => a.sort_order - b.sort_order).map((m, idx) => ({ ...m, sort_order: idx }));
}
