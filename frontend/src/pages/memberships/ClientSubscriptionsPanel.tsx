import { useInvalidate } from "@refinedev/core";
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Skeleton,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authBearerHeaders, authHeaders } from "../../lib/api";
import { formatMoney } from "../../lib/money";

type PlanTemplate = {
  id: number;
  name: string;
  code?: string | null;
  duration_days: number;
  price?: number | string | null;
  discount_price?: number | string | null;
  currency?: string;
  image_url?: string | null;
};

type Sub = {
  id: number;
  plan_template_id: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
  notes?: string | null;
  plan_template: PlanTemplate | null;
};

type Props = {
  clientId: number;
  allowMutation: boolean;
  /** When the panel sits inside a parent Card, hide the duplicate section title. */
  compactHeader?: boolean;
  /** Two titled cards: current memberships vs assign form (e.g. Quick desk). */
  splitLayout?: boolean;
};

export function ClientSubscriptionsPanel({ clientId, allowMutation, compactHeader, splitLayout }: Props) {
  const { t, i18n } = useTranslation();
  const invalidate = useInvalidate();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [assignForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Sub | null>(null);
  const loc = i18n.language;

  const formatDt = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return t("common.dash");
      return dayjs(iso).format("MMM D, YYYY h:mm A");
    },
    [t],
  );

  const refreshClientCaches = useCallback(() => {
    void invalidate({
      resource: "clients",
      invalidates: ["list", "detail"],
      id: String(clientId),
    });
  }, [invalidate, clientId]);

  const loadSubs = useCallback(() => {
    setLoadingSubs(true);
    void (async () => {
      try {
        const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions`, {
          headers: authBearerHeaders(),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const detail =
            typeof data === "object" && data !== null && "detail" in data
              ? String((data as { detail: unknown }).detail)
              : res.statusText;
          message.error(detail || t("memberships.panel.loadSubsError"));
          setSubs([]);
          return;
        }
        setSubs(Array.isArray(data) ? (data as Sub[]) : []);
      } catch {
        message.error(t("memberships.panel.loadSubsError"));
        setSubs([]);
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [clientId, t]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  useEffect(() => {
    if (!allowMutation) return;
    void fetch(`${apiPrefix}/plan-templates?limit=100&offset=0`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => setTemplates((j.items ?? []) as PlanTemplate[]));
  }, [allowMutation]);

  const selectedTplId = Form.useWatch("plan_template_id", assignForm);
  const startsWatch = Form.useWatch("starts_at", assignForm);
  const autoEnd = Form.useWatch("auto_end", assignForm);

  const selectedTpl = templates.find((x) => x.id === selectedTplId);

  const assignSubscription = async (values: {
    plan_template_id: number;
    starts_at: dayjs.Dayjs;
    ends_at?: dayjs.Dayjs | null;
    auto_end?: boolean;
    notes?: string;
  }) => {
    const useDefaultEnd = values.auto_end !== false;
    const body = {
      plan_template_id: values.plan_template_id,
      starts_at: values.starts_at.toISOString(),
      ends_at: useDefaultEnd ? null : values.ends_at ? values.ends_at.toISOString() : null,
      notes: values.notes?.trim() || null,
    };
    const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("memberships.panel.assigned"));
    assignForm.resetFields();
    assignForm.setFieldsValue({ auto_end: true });
    loadSubs();
    refreshClientCaches();
  };

  const applyDurationEnd = () => {
    const start = assignForm.getFieldValue("starts_at") as dayjs.Dayjs | undefined;
    const tid = assignForm.getFieldValue("plan_template_id") as number | undefined;
    const tpl = templates.find((x) => x.id === tid);
    if (!start || !tpl?.duration_days) {
      message.warning(t("memberships.panel.pickPlanFirst"));
      return;
    }
    assignForm.setFieldsValue({
      ends_at: start.add(tpl.duration_days, "day"),
      auto_end: false,
    });
  };

  const openEdit = (row: Sub) => {
    setEditing(row);
    editForm.setFieldsValue({
      starts_at: row.starts_at ? dayjs(row.starts_at) : undefined,
      ends_at: row.ends_at ? dayjs(row.ends_at) : undefined,
      notes: row.notes ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const v = await editForm.validateFields();
      const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions/${editing.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          starts_at: (v.starts_at as dayjs.Dayjs).toISOString(),
          ends_at: v.ends_at ? (v.ends_at as dayjs.Dayjs).toISOString() : null,
          notes: typeof v.notes === "string" && v.notes.trim() ? v.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      message.success(t("memberships.panel.subscriptionUpdated"));
      setEditOpen(false);
      setEditing(null);
      loadSubs();
      refreshClientCaches();
    } catch {
      /* validation */
    }
  };

  const subStatusColor = (s: string) => {
    if (s === "active") return "success";
    if (s === "cancelled" || s === "canceled") return "default";
    if (s === "expired") return "warning";
    return "processing";
  };

  const renderPlanBlock = (r: Sub) => {
    const pt = r.plan_template;
    const cur = pt?.currency ?? "USD";
    const showDisc = pt?.discount_price != null && pt.discount_price !== "";
    return (
      <Space align="start" size={12}>
        <Avatar src={pt?.image_url || undefined} size={44} style={{ flexShrink: 0 }}>
          {(pt?.name || "?").slice(0, 1).toUpperCase()}
        </Avatar>
        <Space direction="vertical" size={2}>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {pt?.name ?? t("common.dash")}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("memberships.panel.planId")} {r.plan_template_id}
            {pt?.code ? ` · ${pt.code}` : ""}
          </Typography.Text>
          {pt ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {showDisc ? (
                <Space size={4}>
                  <span style={{ textDecoration: "line-through" }}>{formatMoney(pt.price, cur, loc)}</span>
                  <span>{formatMoney(pt.discount_price, cur, loc)}</span>
                </Space>
              ) : (
                formatMoney(pt.price, cur, loc)
              )}
            </Typography.Text>
          ) : null}
        </Space>
      </Space>
    );
  };

  const summaryBlock = (
    <>
      {loadingSubs ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : subs.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: splitLayout ? 0 : 16 }}>
          {t("memberships.panel.noSubscriptionsYet")}
        </Typography.Paragraph>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%", marginBottom: splitLayout ? 0 : 8 }}>
          {subs.map((r) => (
            <Card key={r.id} size="small" styles={{ body: { padding: "14px 16px" } }}>
              <Row gutter={[16, 12]} align="top">
                <Col xs={24} lg={10}>
                  {renderPlanBlock(r)}
                </Col>
                <Col xs={12} sm={12} lg={6}>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {t("memberships.panel.starts")}
                  </Typography.Text>
                  <Typography.Text>{formatDt(r.starts_at)}</Typography.Text>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {t("memberships.panel.ends")}
                  </Typography.Text>
                  <Typography.Text>{formatDt(r.ends_at)}</Typography.Text>
                </Col>
                <Col xs={24} lg={2} style={{ textAlign: "end" }}>
                  <Tag color={subStatusColor(r.status)}>{r.status}</Tag>
                </Col>
                {allowMutation ? (
                  <Col
                    xs={24}
                    style={{
                      borderTop: "1px solid rgba(148, 163, 184, 0.12)",
                      paddingTop: 12,
                      marginTop: 4,
                    }}
                  >
                    <Space wrap>
                      <Button size="small" type="primary" ghost onClick={() => openEdit(r)}>
                        {t("memberships.panel.editDates")}
                      </Button>
                      <Button
                        size="small"
                        onClick={async () => {
                          const ends = dayjs(r.ends_at ?? undefined).add(30, "day");
                          const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions/${r.id}`, {
                            method: "PATCH",
                            headers: authHeaders(),
                            body: JSON.stringify({ ends_at: ends.toISOString() }),
                          });
                          if (res.ok) {
                            message.success(t("memberships.panel.extended"));
                            loadSubs();
                            refreshClientCaches();
                          } else message.error(await res.text());
                        }}
                      >
                        {t("memberships.panel.extend30")}
                      </Button>
                    </Space>
                  </Col>
                ) : null}
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </>
  );

  const assignCard = (
    <Card
      size="small"
      title={t("memberships.panel.assignTitle")}
      style={splitLayout ? undefined : { marginTop: 16 }}
      styles={{ body: { paddingBottom: 16 } }}
    >
      <Form
        form={assignForm}
        layout="vertical"
        onFinish={assignSubscription}
        style={{ maxWidth: 480 }}
        initialValues={{ auto_end: true }}
      >
        <Form.Item name="plan_template_id" label={t("memberships.panel.planField")} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder={t("memberships.panel.planPh")}
            filterOption={(input, option) => {
              const id = option?.value as number | undefined;
              const tpl = templates.find((x) => x.id === id);
              if (!tpl) return false;
              const q = input.toLowerCase();
              return (
                tpl.name.toLowerCase().includes(q) ||
                String(tpl.id).includes(q) ||
                (tpl.code?.toLowerCase().includes(q) ?? false)
              );
            }}
            options={templates.map((tpl) => ({
              value: tpl.id,
              label: `${tpl.name} (#${tpl.id})${tpl.code ? ` · ${tpl.code}` : ""}`,
            }))}
          />
        </Form.Item>

        {selectedTpl ? (
          <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: 12 } }}>
            <Space align="start">
              <Avatar src={selectedTpl.image_url || undefined} size={48}>
                {selectedTpl.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Text strong>{selectedTpl.name}</Typography.Text>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t("memberships.panel.templatePreview", {
                      days: selectedTpl.duration_days,
                      id: selectedTpl.id,
                      codeSuffix: selectedTpl.code ? ` · ${selectedTpl.code}` : "",
                    })}
                  </Typography.Text>
                </div>
              </div>
            </Space>
          </Card>
        ) : null}

        <Form.Item name="starts_at" label={t("memberships.panel.start")} rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="auto_end"
          label={t("memberships.panel.endMode")}
          valuePropName="checked"
          extra={t("memberships.panel.endModeExtra")}
        >
          <Switch
            checkedChildren={t("memberships.panel.usePlanDuration")}
            unCheckedChildren={t("memberships.panel.customEnd")}
          />
        </Form.Item>

        {autoEnd === false ? (
          <Form.Item name="ends_at" label={t("memberships.panel.customEndField")}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        ) : null}

        <Space wrap style={{ marginBottom: 16 }}>
          <Button onClick={applyDurationEnd} disabled={!startsWatch || !selectedTpl}>
            {t("memberships.panel.setEndButton", { days: selectedTpl?.duration_days ?? "…" })}
          </Button>
        </Space>

        <Form.Item name="notes" label={t("memberships.panel.notes")}>
          <Input.TextArea rows={2} placeholder={t("memberships.panel.notesPh")} />
        </Form.Item>

        <Button type="primary" htmlType="submit">
          {t("memberships.panel.assign")}
        </Button>
      </Form>
    </Card>
  );

  const summarySection = splitLayout ? (
    <Card size="small" title={t("memberships.panel.summarySectionTitle")} style={{ marginBottom: 0 }}>
      {summaryBlock}
    </Card>
  ) : (
    summaryBlock
  );

  return (
    <section id="client-financial-subscriptions">
      {!compactHeader ? <Typography.Title level={5}>{t("memberships.panel.title")}</Typography.Title> : null}
      {!allowMutation ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("memberships.panel.readOnlyHint")}{" "}
          <Link to="/clients">{t("memberships.panel.readOnlyLink")}</Link>.
        </Typography.Paragraph>
      ) : null}

      <Space direction="vertical" size={splitLayout ? 16 : 0} style={{ width: "100%" }}>
        {summarySection}
        {allowMutation ? (
          <>
            {assignCard}
            <Modal
              title={t("memberships.panel.modalTitle")}
              open={editOpen}
              onCancel={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              onOk={saveEdit}
              destroyOnClose
            >
              <Form form={editForm} layout="vertical">
                <Form.Item name="starts_at" label={t("memberships.panel.modalStarts")} rules={[{ required: true }]}>
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="ends_at" label={t("memberships.panel.modalEnds")}>
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="notes" label={t("memberships.panel.modalNotes")}>
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Form>
            </Modal>
          </>
        ) : null}
      </Space>
    </section>
  );
}
