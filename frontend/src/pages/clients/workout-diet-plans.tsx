import { useOne } from "@refinedev/core";
import { App, Breadcrumb, Button, Card, Divider, Form, Input, Space, Spin, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  normalizeWorkoutItemsForApi,
  type WorkoutLine,
  WorkoutItemsEditor,
} from "../../components/WorkoutItemsEditor";
import { apiPrefix, authHeaders } from "../../lib/api";

type CoachingPayload = {
  workout_plan: string | null;
  diet_plan: string | null;
  workout_items?: Array<{
    exercise_id: number;
    sort_order: number;
    sets: number | null;
    reps: number | null;
    duration_sec: number | null;
    rest_sec: number | null;
    notes: string | null;
    exercise_name?: string | null;
  }>;
  updated_at: string | null;
};

function mapApiItemsToLines(
  items: NonNullable<CoachingPayload["workout_items"]> | undefined,
): WorkoutLine[] {
  if (!items?.length) return [];
  return [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((x) => ({
      exercise_id: x.exercise_id,
      sort_order: x.sort_order,
      sets: x.sets ?? null,
      reps: x.reps ?? null,
      duration_sec: x.duration_sec ?? null,
      rest_sec: x.rest_sec ?? null,
      notes: x.notes ?? null,
      exercise_name: x.exercise_name ?? undefined,
    }));
}

export function ClientWorkoutDietPlansPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = id ? Number(id) : Number.NaN;
  const valid = Number.isFinite(clientId);
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [lines, setLines] = useState<WorkoutLine[]>([]);

  const clientQuery = useOne({
    resource: "clients",
    id: valid ? String(clientId) : "",
    queryOptions: { enabled: valid },
  });
  const clientRecord = clientQuery.data?.data as { name?: string } | undefined;
  const clientName = clientRecord?.name;
  const clientLoading = clientQuery.isLoading ?? false;

  const load = useCallback(async () => {
    if (!valid) return;
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
      form.setFieldsValue({
        workout_plan: data.workout_plan ?? "",
        diet_plan: data.diet_plan ?? "",
      });
      setLines(mapApiItemsToLines(data.workout_items));
      setUpdatedAt(data.updated_at);
    } catch {
      message.error(t("clients.plans.loadError"));
    } finally {
      setLoading(false);
    }
  }, [clientId, form, message, t, valid]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFinish = async (values: { workout_plan?: string; diet_plan?: string }) => {
    if (!valid) return;
    setSaving(true);
    try {
      const body = {
        workout_plan: values.workout_plan?.trim() ? values.workout_plan.trim() : null,
        diet_plan: values.diet_plan?.trim() ? values.diet_plan.trim() : null,
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
      setLines(mapApiItemsToLines(data.workout_items));
      message.success(t("clients.plans.saved"));
    } catch {
      message.error(t("clients.plans.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!valid) {
    return (
      <Typography.Paragraph>
        {t("clients.plans.invalidClient")}{" "}
        <Link to="/clients">{t("clients.finance.backToClients")}</Link>
      </Typography.Paragraph>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/clients">{t("clients.finance.breadcrumbClients")}</Link> },
          {
            title: (
              <Link to={`/clients/show/${clientId}`}>
                {clientLoading ? "…" : (clientName ?? `#${clientId}`)}
              </Link>
            ),
          },
          { title: t("clients.plans.pageTitle") },
        ]}
      />

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t("clients.plans.pageTitle")}
          </Typography.Title>
          <Typography.Text type="secondary">{t("clients.plans.pageSubtitle")}</Typography.Text>
        </div>

        <Card>
          <Spin spinning={loading}>
            {updatedAt ? (
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 12 }}>
                {t("clients.plans.lastUpdated")}: {new Date(updatedAt).toLocaleString()}
              </Typography.Text>
            ) : null}

            <WorkoutItemsEditor
              mode="client"
              planVenue={null}
              initialItems={lines}
              showSaveButton={false}
              onChange={setLines}
            />

            <Divider />

            <Typography.Title level={5}>{t("clients.plans.notesSectionTitle")}</Typography.Title>
            <Typography.Paragraph type="secondary">{t("clients.plans.notesSectionHint")}</Typography.Paragraph>

            <Form form={form} layout="vertical" onFinish={(v) => void onFinish(v)}>
              <Form.Item name="workout_plan" label={t("clients.plans.workoutNotesLabel")}>
                <Input.TextArea
                  rows={6}
                  placeholder={t("clients.plans.workoutPlaceholder")}
                  showCount
                  maxLength={32000}
                />
              </Form.Item>
              <Form.Item name="diet_plan" label={t("clients.plans.dietLabel")}>
                <Input.TextArea
                  rows={8}
                  placeholder={t("clients.plans.dietPlaceholder")}
                  showCount
                  maxLength={32000}
                />
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {t("clients.plans.save")}
                </Button>
                <Button onClick={() => navigate(`/clients/show/${clientId}`)}>
                  {t("clients.plans.backToClient")}
                </Button>
              </Space>
            </Form>
          </Spin>
        </Card>
      </Space>
    </div>
  );
}
