import { Card, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Typography } from "antd";
import type { SelectProps } from "antd/es/select";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ClientPlansCta } from "./ClientPlansCta";

type ClientFormSectionsProps = {
  goalTypeSelectProps: SelectProps;
  planSelectProps: SelectProps;
  isCreate: boolean;
  /** Create wizard: show only one step at a time. Omit for edit (all sections visible). */
  createWizardStep?: 0 | 1 | 2 | 3;
  /** Edit flow: link to workout & diet plans for this client */
  coachingPlansClientId?: number;
};

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="client-form-section__head">
      <Typography.Title level={5} className="client-form-section__title">
        {title}
      </Typography.Title>
      <Typography.Text type="secondary" className="client-form-section__hint">
        {hint}
      </Typography.Text>
    </header>
  );
}

export function ClientFormSections({
  goalTypeSelectProps,
  planSelectProps,
  isCreate,
  createWizardStep,
  coachingPlansClientId,
}: ClientFormSectionsProps) {
  const { t } = useTranslation();
  const wizard = createWizardStep !== undefined;
  const stepHidden = (s: 0 | 1 | 2 | 3) => Boolean(wizard && createWizardStep !== s);
  const unifiedLayout = !wizard;

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

  const sectionCardClass = "client-section-card client-section-card--editable";

  const contactBlock = (
    <>
      <SectionHead title={t("clients.form.contactTitle")} hint={t("clients.form.contactHint")} />
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
    </>
  );

  const bodyBlock = (
    <>
      <SectionHead title={t("clients.form.bodyTitle")} hint={t("clients.form.bodyHint")} />
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
    </>
  );

  const goalsBlock = (
    <>
      <SectionHead title={t("clients.form.goalsTitle")} hint={t("clients.form.goalsHint")} />
      <Form.Item name="goal_type_id" label={t("clients.form.primaryGoal")}>
        <Select
          {...goalTypeSelectProps}
          allowClear
          style={{ width: "100%" }}
          placeholder={t("clients.form.goalCatalogPh")}
        />
      </Form.Item>
      <Form.Item name="goal" label={t("clients.form.goalDetails")}>
        <Input.TextArea rows={3} placeholder={t("clients.form.goalDetailsPh")} showCount maxLength={500} />
      </Form.Item>
    </>
  );

  const membershipBlock = (
    <>
      <SectionHead title={t("clients.form.membershipTitle")} hint={t("clients.form.membershipHint")} />
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
    </>
  );

  const accountBlock = (
    <>
      <SectionHead title={t("clients.form.accountTitle")} hint={t("clients.form.accountHint")} />
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
    </>
  );

  const notesBlock = (
    <>
      <SectionHead title={t("clients.form.notesTitle")} hint={t("clients.form.notesHint")} />
      <Form.Item name="notes" label={t("clients.form.notesLabel")}>
        <Input.TextArea rows={4} placeholder={t("clients.form.notesPh")} />
      </Form.Item>
    </>
  );

  if (unifiedLayout) {
    return (
      <>
        <div className="client-form-unified">
          <Card bordered={false} className="client-profile-editor-surface" size="small">
            <section className="client-form-section">{contactBlock}</section>
            <Divider className="client-form-section-divider" />
            <section className="client-form-section">{bodyBlock}</section>
            <Divider className="client-form-section-divider" />
            <section className="client-form-section">{goalsBlock}</section>
            <Divider className="client-form-section-divider" />
            <section className="client-form-section">{membershipBlock}</section>
            <Divider className="client-form-section-divider" />
            <section className="client-form-section">{accountBlock}</section>
            <Divider className="client-form-section-divider" />
            <section className="client-form-section">{notesBlock}</section>
          </Card>
        </div>
        {coachingPlansClientId != null ? <ClientPlansCta clientId={coachingPlansClientId} compact /> : null}
      </>
    );
  }

  return (
    <>
    <Space direction="vertical" size={16} style={{ width: "100%", maxWidth: 840 }}>
      <div hidden={stepHidden(0)}>
        <Card size="small" className={sectionCardClass} title={t("clients.form.contactTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
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
        <Card size="small" className={sectionCardClass} title={t("clients.form.bodyTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
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
        <Card size="small" className={sectionCardClass} title={t("clients.form.goalsTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
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
        <Card size="small" className={sectionCardClass} title={t("clients.form.membershipTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
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
        <Card size="small" className={sectionCardClass} title={t("clients.form.accountTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
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
        <Card size="small" className={sectionCardClass} title={t("clients.form.notesTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
            {t("clients.form.notesHint")}
          </Typography.Paragraph>
          <Form.Item name="notes" label={t("clients.form.notesLabel")} style={{ marginBottom: 0 }}>
            <Input.TextArea rows={4} placeholder={t("clients.form.notesPh")} />
          </Form.Item>
        </Card>
      </div>

      <div hidden={stepHidden(3)}>
        <Card size="small" className={sectionCardClass} title={t("clients.plans.pageTitle")}>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 0, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}
          >
            {t("clients.wizard.stepWorkoutDietHint")}
          </Typography.Paragraph>
          <Form.Item name="workout_plan" label={t("clients.plans.workoutLabel")}>
            <Input.TextArea rows={8} placeholder={t("clients.plans.workoutPlaceholder")} />
          </Form.Item>
          <Form.Item name="diet_plan" label={t("clients.plans.dietLabel")} style={{ marginBottom: 0 }}>
            <Input.TextArea rows={8} placeholder={t("clients.plans.dietPlaceholder")} />
          </Form.Item>
        </Card>
      </div>
    </Space>
    </>
  );
}
