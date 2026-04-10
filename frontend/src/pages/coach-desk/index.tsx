import { useCreate, useInvalidate, useList } from "@refinedev/core";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatMoney } from "../../lib/money";
import { ClientSubscriptionsPanel } from "../memberships/ClientSubscriptionsPanel";

type MembershipSummary = {
  plan_name: string;
  ends_at?: string | null;
};

function clientMembership(c: BaseRecord): MembershipSummary | undefined {
  const x = c as Record<string, unknown>;
  return x.membership_summary as MembershipSummary | undefined;
}

/**
 * Minimal coach workflow: add client, add invoice, assign plan, see due dates.
 */
export function CoachDeskPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [clientForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();
  const [planClientId, setPlanClientId] = useState<number | null>(null);

  const { data: clientsData, isLoading: clientsLoading } = useList({
    resource: "clients",
    pagination: { pageSize: 400, mode: "server" },
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useList({
    resource: "invoices",
    pagination: { pageSize: 300, mode: "server" },
  });

  const clients = clientsData?.data ?? [];
  const invoices = invoicesData?.data ?? [];

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.id as number,
        label: String(c.name ?? `#${c.id}`),
      })),
    [clients],
  );

  const { mutate: createClient, isPending: savingClient } = useCreate({
    successNotification: false,
  });
  const { mutate: createInvoice, isPending: savingInvoice } = useCreate({
    successNotification: false,
  });

  const onAddClient = (values: { name: string; phone?: string }) => {
    createClient(
      {
        resource: "clients",
        values: {
          name: values.name.trim(),
          phone: values.phone?.trim() || undefined,
          status: "active",
          account_status: "good_standing",
        },
        invalidates: ["list"],
      },
      {
        onSuccess: () => {
          message.success(t("coachDesk.clientAdded"));
          clientForm.resetFields();
          void invalidate({ resource: "clients", invalidates: ["list"] });
        },
        onError: (e: HttpError) => {
          message.error(e?.message ?? t("coachDesk.saveError"));
        },
      },
    );
  };

  const onAddInvoice = (values: {
    client_id: number;
    amount?: number;
    due_date?: dayjs.Dayjs;
  }) => {
    createInvoice(
      {
        resource: "invoices",
        values: {
          client_id: values.client_id,
          amount: values.amount ?? undefined,
          currency: "USD",
          status: "pending",
          due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : undefined,
        },
        invalidates: ["list"],
      },
      {
        onSuccess: () => {
          message.success(t("coachDesk.invoiceAdded"));
          invoiceForm.resetFields();
          void invalidate({ resource: "invoices", invalidates: ["list"] });
        },
        onError: (e: HttpError) => {
          message.error(e?.message ?? t("coachDesk.saveError"));
        },
      },
    );
  };

  const dueRows = useMemo(() => {
    type Row = {
      key: string;
      kind: "invoice" | "membership";
      who: string;
      detail: string;
      when: dayjs.Dayjs | null;
      sort: number;
      amount?: string;
      currency?: string;
    };
    const out: Row[] = [];
    for (const inv of invoices) {
      const st = String(inv.status ?? "");
      if (st === "paid" || st === "cancelled") continue;
      const due = inv.due_date ? dayjs(String(inv.due_date)) : null;
      const clientName =
        inv.client && typeof inv.client === "object" && "name" in inv.client
          ? String((inv.client as { name: string }).name)
          : `#${inv.client_id}`;
      out.push({
        key: `i-${inv.id}`,
        kind: "invoice",
        who: clientName,
        detail: inv.reference ? String(inv.reference) : t("coachDesk.invoiceNoRef"),
        when: due,
        sort: due ? due.valueOf() : Number.POSITIVE_INFINITY,
        amount: inv.amount != null && inv.amount !== "" ? String(inv.amount) : undefined,
        currency: String(inv.currency ?? "USD"),
      });
    }
    for (const c of clients) {
      const ms = clientMembership(c);
      if (!ms?.ends_at) continue;
      const when = dayjs(ms.ends_at);
      out.push({
        key: `m-${c.id}`,
        kind: "membership",
        who: String(c.name ?? ""),
        detail: ms.plan_name,
        when,
        sort: when.valueOf(),
      });
    }
    return out.sort((a, b) => a.sort - b.sort).slice(0, 24);
  }, [clients, invoices, t]);

  const loc = i18n.language;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t("coachDesk.title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("coachDesk.subtitle")}
          </Typography.Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card size="small" title={t("coachDesk.addClient")} loading={clientsLoading}>
              <Form form={clientForm} layout="vertical" onFinish={onAddClient}>
                <Form.Item name="name" label={t("coachDesk.clientName")} rules={[{ required: true }]}>
                  <Input placeholder={t("coachDesk.clientNamePh")} />
                </Form.Item>
                <Form.Item name="phone" label={t("coachDesk.phoneOptional")}>
                  <Input placeholder={t("coachDesk.phonePh")} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={savingClient} block>
                  {t("coachDesk.addClientSubmit")}
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card size="small" title={t("coachDesk.addInvoice")} loading={invoicesLoading}>
              <Form form={invoiceForm} layout="vertical" onFinish={onAddInvoice}>
                <Form.Item name="client_id" label={t("coachDesk.client")} rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={clientOptions}
                    placeholder={t("coachDesk.chooseClient")}
                    disabled={clientOptions.length === 0}
                  />
                </Form.Item>
                <Form.Item name="amount" label={t("coachDesk.amount")}>
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="0" />
                </Form.Item>
                <Form.Item
                  name="due_date"
                  label={t("coachDesk.dueDate")}
                  getValueFromEvent={(d) => d ?? null}
                  getValueProps={(v) => ({ value: v ?? undefined })}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={savingInvoice} block>
                  {t("coachDesk.addInvoiceSubmit")}
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card size="small" title={t("coachDesk.planSection")}>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0, fontSize: 13 }}>
                {t("coachDesk.planHelp")}
              </Typography.Paragraph>
              <Select
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder={t("coachDesk.chooseClient")}
                options={clientOptions}
                style={{ width: "100%", marginBottom: 12 }}
                value={planClientId ?? undefined}
                onChange={(v) => setPlanClientId(typeof v === "number" ? v : null)}
              />
              {planClientId != null ? (
                <ClientSubscriptionsPanel clientId={planClientId} allowMutation compactHeader />
              ) : (
                <Typography.Text type="secondary">{t("coachDesk.pickClientForPlan")}</Typography.Text>
              )}
            </Card>
          </Col>
        </Row>

        <Card size="small" title={t("coachDesk.dueGlance")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, fontSize: 13 }}>
            {t("coachDesk.dueGlanceHint")}
          </Typography.Paragraph>
          <Table
            size="small"
            pagination={false}
            loading={clientsLoading || invoicesLoading}
            locale={{ emptyText: t("coachDesk.noDues") }}
            dataSource={dueRows}
            rowKey="key"
            columns={[
              {
                title: t("coachDesk.colType"),
                width: 120,
                render: (_, r) =>
                  r.kind === "invoice" ? t("coachDesk.typeInvoice") : t("coachDesk.typeMembership"),
              },
              {
                title: t("coachDesk.colWho"),
                render: (_, r) => r.who,
              },
              {
                title: t("coachDesk.colWhat"),
                ellipsis: true,
                render: (_, r) =>
                  r.kind === "invoice" && r.amount != null
                    ? `${r.detail} · ${formatMoney(r.amount, r.currency ?? "USD", loc)}`
                    : r.detail,
              },
              {
                title: t("coachDesk.colWhen"),
                width: 160,
                render: (_, r) =>
                  r.when ? r.when.format("MMM D, YYYY") : t("common.dash"),
              },
            ]}
          />
        </Card>

        <Space wrap size="middle">
          <Link to="/dashboard">{t("coachDesk.openDashboard")}</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link to="/clients">{t("coachDesk.viewClients")}</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link to="/invoices">{t("coachDesk.viewInvoices")}</Link>
        </Space>
      </Space>
    </div>
  );
}
