import { PlusOutlined } from "@ant-design/icons";
import { Edit, useForm } from "@refinedev/antd";
import { Button, Col, Form, Input, InputNumber, Row, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ExerciseFormMediaUpload } from "../../components/ExerciseFormMediaUpload";

const PLAN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function PlanTemplateEdit() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm({ resource: "plan-templates" });

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Link to="/plan-templates/create">
            <Button type="default" icon={<PlusOutlined />} size="middle">
              {t("common.quickLinks.newMembershipPlan")}
            </Button>
          </Link>
        </>
      )}
    >
      <Form {...formProps} layout="vertical">
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t("planTemplates.edit.hint")}
        </Typography.Paragraph>
        <Form.Item name="name" label={t("planTemplates.create.name")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="code" label={t("planTemplates.create.code")} tooltip={t("planTemplates.create.codeTooltip")}>
          <Input allowClear />
        </Form.Item>
        <Form.Item name="description" label={t("planTemplates.create.description")}>
          <Input.TextArea rows={2} />
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
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="currency" label={t("planTemplates.create.currency")}>
              <Input maxLength={8} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="sort_order" label={t("planTemplates.create.sortOrder")}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="price" label={t("planTemplates.create.price")}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="discount_price" label={t("planTemplates.create.discount")}>
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="is_active" label={t("planTemplates.create.active")} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
}
