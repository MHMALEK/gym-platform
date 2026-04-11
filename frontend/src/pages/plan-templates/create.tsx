import { Create, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";

import { ExerciseFormMediaUpload } from "../../components/ExerciseFormMediaUpload";

const PLAN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function PlanTemplateCreate() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "plan-templates" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t("planTemplates.create.hint")}
        </Typography.Paragraph>
        <Form.Item name="name" label={t("planTemplates.create.name")} rules={[{ required: true }]}>
          <Input placeholder={t("planTemplates.create.namePh")} />
        </Form.Item>
        <Form.Item name="code" label={t("planTemplates.create.code")} tooltip={t("planTemplates.create.codeTooltip")}>
          <Input placeholder={t("planTemplates.create.codePh")} allowClear />
        </Form.Item>
        <Form.Item name="description" label={t("planTemplates.create.description")}>
          <Input.TextArea rows={2} placeholder={t("planTemplates.create.descPh")} />
        </Form.Item>
        <Form.Item name="image_url" label={t("planTemplates.create.imageUrl")} tooltip={t("planTemplates.create.imageTooltip")}>
          <ExerciseFormMediaUpload
            variant="thumbnail"
            accept={PLAN_IMAGE_ACCEPT}
            emptyHint={t("planTemplates.create.imageEmpty")}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="duration_days" label={t("planTemplates.create.duration")} rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: "100%" }} placeholder="30" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="currency" label={t("planTemplates.create.currency")} initialValue="USD">
              <Input placeholder="USD" maxLength={8} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="sort_order" label={t("planTemplates.create.sortOrder")} initialValue={0}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="price" label={t("planTemplates.create.price")}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="discount_price" label={t("planTemplates.create.discount")}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder={t("planTemplates.create.discountPh")} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="is_active" label={t("planTemplates.create.active")} valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
}
