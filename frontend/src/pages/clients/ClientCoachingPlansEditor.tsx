import { SaveOutlined } from "@ant-design/icons";
import { type BaseRecord, useList } from "@refinedev/core";
import { App, Button, Card, Divider, Form, Input, Select, Space, Spin, Table, Typography } from "antd";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { WorkoutRichEditor } from "../../components/WorkoutRichEditor";
import {
  normalizeWorkoutItemsForApi,
  type WorkoutLine,
  workoutLinesFromApiItems,
  WorkoutItemsEditor,
} from "../../components/WorkoutItemsEditor";
import { apiPrefix, authHeaders } from "../../lib/api";
import { dietMealsFromApi, normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";

export type CoachingPayload = {
  workout_plan: string | null;
  workout_rich_html: string | null;
  program_venue?: string | null;
  diet_plan: string | null;
  diet_meals?: unknown[];
  workout_items?: Array<{
    exercise_id: number;
    sort_order: number;
    sets: number | null;
    reps: number | null;
    duration_sec: number | null;
    rest_sec: number | null;
    notes: string | null;
    block_id?: string | null;
    block_type?: string | null;
    exercise_name?: string | null;
  }>;
  updated_at: string | null;
};

type Props = {
  clientId: number;
  /** When true, render inside client show tab (no duplicate page chrome). */
  embed?: boolean;
  /** Optional actions next to save (e.g. back link). */
  extraActions?: ReactNode;
};

export function ClientCoachingPlansEditor({ clientId, embed, extraActions }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [lines, setLines] = useState<WorkoutLine[]>([]);
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const [nutritionTemplateFilter, setNutritionTemplateFilter] = useState("");

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

  const programVenue = Form.useWatch("program_venue", form);
  const planVenueForPicker =
    programVenue === "home" || programVenue === "commercial_gym" ? programVenue : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      const data = (await res.json()) as CoachingPayload;
      const pv = data.program_venue;
      form.setFieldsValue({
        program_venue: pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed",
        workout_plan: data.workout_plan ?? "",
        workout_rich_html: data.workout_rich_html ?? "",
        diet_plan: data.diet_plan ?? "",
      });
      setLines(workoutLinesFromApiItems(data.workout_items ?? []));
      setDietMeals(dietMealsFromApi(data.diet_meals ?? []));
      setUpdatedAt(data.updated_at);
    } catch {
      message.error(t("clients.plans.loadError"));
    } finally {
      setLoading(false);
    }
  }, [clientId, form, message, t]);

  const applyNutritionTemplate = useCallback(
    async (templateId: number) => {
      try {
        const res = await fetch(`${apiPrefix}/nutrition-templates/${templateId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          message.error(t("clients.plans.templateApplyError"));
          return;
        }
        const json = (await res.json()) as { meals?: unknown[] };
        setDietMeals(dietMealsFromApi(json.meals ?? []));
        message.success(t("clients.plans.templateApplied"));
      } catch {
        message.error(t("clients.plans.templateApplyError"));
      }
    },
    [message, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onFinish = async (values: {
    program_venue?: string;
    workout_plan?: string;
    workout_rich_html?: string;
    diet_plan?: string;
  }) => {
    setSaving(true);
    try {
      const htmlRaw = (values.workout_rich_html ?? "").trim();
      const workoutRich =
        htmlRaw && htmlRaw !== "<p><br></p>" && htmlRaw !== "<p></p>" ? htmlRaw : null;
      const pv = values.program_venue;
      const programVenueOut =
        pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed";
      const body = {
        program_venue: programVenueOut,
        workout_plan: values.workout_plan?.trim() ? values.workout_plan.trim() : null,
        workout_rich_html: workoutRich,
        diet_plan: values.diet_plan?.trim() ? values.diet_plan.trim() : null,
        diet_meals: normalizeDietMealsForApi(dietMeals),
        workout_items: normalizeWorkoutItemsForApi(lines),
      };
      const res = await fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      const data = (await res.json()) as CoachingPayload;
      setUpdatedAt(data.updated_at);
      setLines(workoutLinesFromApiItems(data.workout_items ?? []));
      setDietMeals(dietMealsFromApi(data.diet_meals ?? []));
      message.success(t("clients.plans.saved"));
    } catch {
      message.error(t("clients.plans.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const saveButtons = (
    <Space wrap>
      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
        {t("clients.plans.save")}
      </Button>
      {extraActions}
    </Space>
  );

  const inner = (
    <Spin spinning={loading}>
      {updatedAt ? (
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 12 }}>
          {t("clients.plans.lastUpdated")}: {new Date(updatedAt).toLocaleString()}
        </Typography.Text>
      ) : null}

      <Form form={form} layout="vertical" onFinish={(v) => void onFinish(v)} initialValues={{ program_venue: "mixed" }}>
        {saveButtons}

        <Divider style={{ margin: "16px 0" }} />

        <Form.Item name="program_venue" label={t("clients.plans.programVenue")}>
          <Select
            options={[
              { value: "mixed", label: t("workouts.venue.mixed") },
              { value: "home", label: t("workouts.venue.home") },
              { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
            ]}
          />
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {t("clients.plans.workoutSectionTitle")}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t("clients.plans.workoutSectionHint")}</Typography.Paragraph>

        <Form.Item
          name="workout_rich_html"
          label={t("clients.plans.workoutRichLabel")}
          valuePropName="value"
          getValueFromEvent={(v: string) => v}
        >
          <WorkoutRichEditor placeholder={t("clients.plans.workoutRichPlaceholder")} />
        </Form.Item>

        <WorkoutItemsEditor
          mode="client"
          planId={undefined}
          planVenue={planVenueForPicker}
          initialItems={lines}
          showSaveButton={false}
          onChange={setLines}
        />

        <Divider />

        <Typography.Title level={5}>{t("clients.plans.notesSectionTitle")}</Typography.Title>
        <Typography.Paragraph type="secondary">{t("clients.plans.notesSectionHint")}</Typography.Paragraph>

        <Form.Item name="workout_plan" label={t("clients.plans.workoutNotesLabel")}>
          <Input.TextArea
            rows={6}
            placeholder={t("clients.plans.workoutPlaceholder")}
            showCount
            maxLength={32000}
          />
        </Form.Item>

        <Divider />
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {t("clients.plans.templatesSectionTitle")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("clients.plans.templateApplyHint")}
        </Typography.Paragraph>
        <Space wrap style={{ marginBottom: 12 }}>
          <Link to="/nutrition-templates/create">
            <Button type="primary">{t("clients.plans.newTemplate")}</Button>
          </Link>
          <Link to="/nutrition-templates">
            <Button>{t("clients.plans.manageTemplates")}</Button>
          </Link>
          <Link to="/library/nutrition-templates">
            <Button>{t("nutritionTemplates.list.openCatalog")}</Button>
          </Link>
        </Space>
        <Space direction="vertical" size="middle" style={{ width: "100%", marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder={t("clients.plans.filterTemplatesPlaceholder")}
            value={nutritionTemplateFilter}
            onChange={(e) => setNutritionTemplateFilter(e.target.value)}
            onSearch={setNutritionTemplateFilter}
            style={{ maxWidth: 400 }}
          />
          <Table<BaseRecord>
            size="small"
            rowKey="id"
            loading={nutritionTemplatesLoading}
            dataSource={nutritionTemplateRows}
            pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
            locale={{
              emptyText:
                nutritionTemplatesTotalCount === 0
                  ? t("clients.plans.templateEmptyList")
                  : nutritionTemplateFilter.trim()
                    ? t("clients.plans.templateFilterEmpty")
                    : t("clients.plans.templateEmptyList"),
            }}
          >
            <Table.Column dataIndex="name" title={t("nutritionTemplates.list.name")} ellipsis />
            <Table.Column
              dataIndex="meal_count"
              title={t("nutritionTemplates.list.meals")}
              width={88}
              render={(v: number) => v ?? 0}
            />
            <Table.Column<BaseRecord>
              title={t("nutritionTemplates.list.actions")}
              width={220}
              render={(_, r) => (
                <Space wrap size="small">
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => void applyNutritionTemplate(Number(r.id))}
                  >
                    {t("clients.plans.templateApply")}
                  </Button>
                  <Link to={`/nutrition-templates/edit/${r.id}`}>
                    <Button size="small">{t("actions.edit")}</Button>
                  </Link>
                </Space>
              )}
            />
          </Table>
        </Space>
        <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />

        <Form.Item name="diet_plan" label={t("clients.plans.dietLabel")}>
          <Input.TextArea
            rows={8}
            placeholder={t("clients.plans.dietPlaceholder")}
            showCount
            maxLength={32000}
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />
        {saveButtons}
      </Form>
    </Spin>
  );

  if (embed) {
    return (
      <div id="client-tab-workout" style={{ paddingTop: 4, maxWidth: 960 }}>
        <Card className="client-section-card client-section-card--editable" styles={{ body: { paddingTop: 16 } }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            {t("clients.plans.embedTitle")}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{t("clients.plans.embedSubtitle")}</Typography.Paragraph>
          {inner}
        </Card>
      </div>
    );
  }

  return <Card styles={{ body: { paddingTop: 16 } }}>{inner}</Card>;
}
