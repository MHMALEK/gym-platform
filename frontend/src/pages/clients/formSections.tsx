import { Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from "antd";
import type { SelectProps } from "antd/es/select";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type ClientFormSectionsProps = {
  goalTypeSelectProps: SelectProps;
  planSelectProps: SelectProps;
  isCreate: boolean;
  /** Create wizard: show only one step at a time. Omit for edit (all sections visible). */
  createWizardStep?: 0 | 1 | 2;
};

export function ClientFormSections({
  goalTypeSelectProps,
  planSelectProps,
  isCreate,
  createWizardStep,
}: ClientFormSectionsProps) {
  const { t } = useTranslation();
  const wizard = createWizardStep !== undefined;
  const stepHidden = (s: 0 | 1 | 2) => Boolean(wizard && createWizardStep !== s);

  const statusOptions = useMemo(
    () =>
      (["active", "inactive", "archived"] as const).map((v) => ({
        value: v,
        label: t(`clients.roster.${v}`),
      })),
    [t],
  );

  const accountStatusOptions = useMemo(
    () =>
      (["good_standing", "payment_issue", "onboarding", "churned"] as const).map((v) => ({
        value: v,
        label: t(`clients.accountStatus.${v}`),
      })),
    [t],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 840 }}>
      <div hidden={stepHidden(0)}>
        <Card size="small" title={t("clients.form.contactTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.contactHint")}
          </Typography.Paragraph>
          <Form.Item name="name" label={t("clients.form.name")} rules={[{ required: true }]}>
            <Input placeholder={t("clients.form.namePh")} />
          </Form.Item>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="email" label={t("clients.form.email")}>
                <Input type="email" placeholder={t("clients.form.emailPh")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label={t("clients.form.phone")}>
                <Input placeholder={t("clients.form.phonePh")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </div>

      <div hidden={stepHidden(1)}>
        <Card size="small" title={t("clients.form.bodyTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.bodyHint")}
          </Typography.Paragraph>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="weight_kg" label={t("clients.form.weight")}>
                <InputNumber min={0} step={0.1} style={{ width: "100%" }} placeholder={t("common.dash")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="height_cm" label={t("clients.form.height")}>
                <InputNumber min={0} step={0.1} style={{ width: "100%" }} placeholder={t("common.dash")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </div>

      <div hidden={stepHidden(1)}>
        <Card size="small" title={t("clients.form.goalsTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.goalsHint")}
          </Typography.Paragraph>
          <Form.Item name="goal_type_id" label={t("clients.form.primaryGoal")}>
            <Select
              {...goalTypeSelectProps}
              allowClear
              style={{ width: "100%" }}
              placeholder={t("clients.form.goalCatalogPh")}
            />
          </Form.Item>
          <Form.Item name="goal" label={t("clients.form.goalDetails")}>
            <Input.TextArea
              rows={3}
              placeholder={t("clients.form.goalDetailsPh")}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Card>
      </div>

      <div hidden={stepHidden(2)}>
        <Card size="small" title={t("clients.form.membershipTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.membershipHint")}
          </Typography.Paragraph>
          <Form.Item
            name="subscription_plan_template_id"
            label={t("clients.form.planTemplate")}
            tooltip={t("clients.form.planTemplateTooltip")}
          >
            <Select
              {...planSelectProps}
              allowClear
              style={{ width: "100%" }}
              placeholder={t("clients.form.planTemplatePh")}
            />
          </Form.Item>
        </Card>
      </div>

      <div hidden={stepHidden(2)}>
        <Card size="small" title={t("clients.form.accountTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.accountHint")}
          </Typography.Paragraph>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label={t("clients.form.roster")}
                {...(isCreate ? { initialValue: "active" } : {})}
              >
                <Select options={statusOptions} placeholder={t("clients.form.rosterPh")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="account_status"
                label={t("clients.form.clientStatus")}
                {...(isCreate ? { initialValue: "good_standing" } : {})}
              >
                <Select options={accountStatusOptions} placeholder={t("clients.form.clientStatusPh")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </div>

      <div hidden={stepHidden(2)}>
        <Card size="small" title={t("clients.form.notesTitle")}>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
            {t("clients.form.notesHint")}
          </Typography.Paragraph>
          <Form.Item name="notes" label={t("clients.form.notesLabel")} style={{ marginBottom: 0 }}>
            <Input.TextArea rows={4} placeholder={t("clients.form.notesPh")} />
          </Form.Item>
        </Card>
      </div>
    </Space>
  );
}
