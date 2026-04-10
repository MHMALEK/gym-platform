import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Input, InputNumber, Row, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
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

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t("nutrition.builderTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t("nutrition.builderHint")}
      </Typography.Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={addMeal}>
              {t("nutrition.addMeal")}
            </Button>

            {meals.length === 0 ? (
              <Typography.Text type="secondary">{t("nutrition.emptyMeals")}</Typography.Text>
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
          </Space>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={t("nutrition.dayOverview")}
            styles={{ body: { paddingTop: 12 } }}
            style={{ position: "sticky", top: 16 }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Typography.Text strong>{t("nutrition.wholeDay")}</Typography.Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("nutrition.totalKcal")}
                    </Typography.Text>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(day.kcal)}</div>
                  </Col>
                  <Col span={12}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("nutrition.gramsSummary")}
                    </Typography.Text>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>
                      {fmt(day.protein_g)} · {fmt(day.carbs_g)} · {fmt(day.fat_g)}
                    </div>
                  </Col>
                </Row>
              </div>

              <div>
                <Typography.Text strong>{t("nutrition.perMealReport")}</Typography.Text>
                <Table
                  size="small"
                  pagination={false}
                  style={{ marginTop: 8 }}
                  locale={{ emptyText: t("nutrition.noMealsYet") }}
                  dataSource={meals.map((m, i) => {
                    const mt = mealTotals(m);
                    return {
                      key: String(i),
                      name: m.name,
                      kcal: mt.kcal,
                      p: mt.protein_g,
                      c: mt.carbs_g,
                      f: mt.fat_g,
                    };
                  })}
                  columns={[
                    { title: t("nutrition.colMeal"), dataIndex: "name", ellipsis: true },
                    { title: t("nutrition.colKcal"), dataIndex: "kcal", width: 72, render: (v: number) => fmt(v) },
                    { title: "P", dataIndex: "p", width: 48, render: (v: number) => fmt(v) },
                    { title: "C", dataIndex: "c", width: 48, render: (v: number) => fmt(v) },
                    { title: "F", dataIndex: "f", width: 48, render: (v: number) => fmt(v) },
                  ]}
                />
              </div>

              <div>
                <Typography.Text strong>{t("nutrition.chartsTitle")}</Typography.Text>
                {showMacroPie ? (
                  <div style={{ width: "100%", height: 240, marginTop: 8 }}>
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
                  </div>
                ) : (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    {t("nutrition.macroPieHint")}
                  </Typography.Paragraph>
                )}

                {showMealChart ? (
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                      {t("nutrition.mealKcalChartTitle")}
                    </Typography.Text>
                    <div style={{ width: "100%", height: 200 }}>
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
                    </div>
                  </div>
                ) : day.kcal > 0 && meals.length > 0 ? (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    {t("nutrition.mealBarHint")}
                  </Typography.Paragraph>
                ) : null}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
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

  const columns: ColumnsType<FoodRow> = [
    {
      title: t("nutrition.colDescription"),
      dataIndex: "description",
      width: "32%",
      render: (_, row) => (
        <Input
          value={row.description}
          placeholder={t("nutrition.foodDescriptionPh")}
          onChange={(e) => onPatchFood(row._i, { description: e.target.value })}
        />
      ),
    },
    {
      title: t("nutrition.colKcal"),
      width: 88,
      render: (_, row) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="—"
          value={row.calories ?? undefined}
          onChange={(v) => onPatchFood(row._i, { calories: v ?? null })}
        />
      ),
    },
    {
      title: t("nutrition.colProteinShort"),
      width: 72,
      render: (_, row) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="—"
          value={row.protein_g ?? undefined}
          onChange={(v) => onPatchFood(row._i, { protein_g: v ?? null })}
        />
      ),
    },
    {
      title: t("nutrition.colCarbsShort"),
      width: 72,
      render: (_, row) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="—"
          value={row.carbs_g ?? undefined}
          onChange={(v) => onPatchFood(row._i, { carbs_g: v ?? null })}
        />
      ),
    },
    {
      title: t("nutrition.colFatShort"),
      width: 72,
      render: (_, row) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="—"
          value={row.fat_g ?? undefined}
          onChange={(v) => onPatchFood(row._i, { fat_g: v ?? null })}
        />
      ),
    },
    {
      title: t("nutrition.colActions"),
      width: 48,
      align: "center",
      render: (_, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          aria-label={t("nutrition.removeFood")}
          onClick={() => onRemoveFood(row._i)}
        />
      ),
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Input
          value={meal.name}
          variant="borderless"
          style={{ fontWeight: 600, paddingLeft: 0 }}
          onChange={(e) => onName(e.target.value)}
        />
      }
      extra={
        <Space size={4} wrap>
          <Button size="small" icon={<ArrowUpOutlined />} disabled={!canUp} onClick={onMoveUp} />
          <Button size="small" icon={<ArrowDownOutlined />} disabled={!canDown} onClick={onMoveDown} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onRemoveMeal}>
            {t("nutrition.removeMeal")}
          </Button>
        </Space>
      }
    >
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("nutrition.mealSubtotal", {
          kcal: Math.round(mt.kcal * 10) / 10,
          p: Math.round(mt.protein_g * 10) / 10,
          c: Math.round(mt.carbs_g * 10) / 10,
          f: Math.round(mt.fat_g * 10) / 10,
        })}
      </Typography.Text>
      <Table<FoodRow>
        size="small"
        style={{ marginTop: 8 }}
        pagination={false}
        rowKey="_i"
        dataSource={dataSource}
        columns={columns}
        locale={{ emptyText: t("nutrition.emptyFoods") }}
      />
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={onAddFood} style={{ marginTop: 8 }}>
        {t("nutrition.addFood")}
      </Button>
      <Input.TextArea
        style={{ marginTop: 10 }}
        rows={2}
        value={meal.notes ?? ""}
        placeholder={t("nutrition.mealNotesPh")}
        onChange={(e) => onNotes(e.target.value)}
      />
    </Card>
  );
}
