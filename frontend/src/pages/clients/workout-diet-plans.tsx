import { useOne } from "@refinedev/core";
import { App, Breadcrumb, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";

type CoachingPayload = {
  workout_plan: string | null;
  diet_plan: string | null;
  updated_at: string | null;
};

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
            <Form form={form} layout="vertical" onFinish={(v) => void onFinish(v)}>
              <Form.Item name="workout_plan" label={t("clients.plans.workoutLabel")}>
                <Input.TextArea rows={12} placeholder={t("clients.plans.workoutPlaceholder")} showCount maxLength={32000} />
              </Form.Item>
              <Form.Item name="diet_plan" label={t("clients.plans.dietLabel")}>
                <Input.TextArea rows={12} placeholder={t("clients.plans.dietPlaceholder")} showCount maxLength={32000} />
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {t("clients.plans.save")}
                </Button>
                <Button onClick={() => navigate(`/clients/show/${clientId}`)}>{t("clients.plans.backToClient")}</Button>
              </Space>
            </Form>
          </Spin>
        </Card>
      </Space>
    </div>
  );
}
