import { SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Button, Card, ColorPicker, Form, Input, Space, Spin, Typography, Upload } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCoachBranding } from "../../contexts/CoachBrandingContext";
import { patchCoachProfile } from "../../lib/coachProfileApi";
import { mediaSrc, uploadMediaFile } from "../../lib/exerciseMediaApi";

export function BrandingSettingsPage() {
  const { t } = useTranslation();
  const { branding, refresh } = useCoachBranding();
  const { notification, message } = App.useApp();
  const [form] = Form.useForm<{
    name: string;
    tagline: string;
    primary_color?: string;
  }>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (branding.loading) return;
    form.setFieldsValue({
      name: branding.name,
      tagline: branding.tagline ?? "",
      primary_color: branding.primaryColor ?? undefined,
    });
  }, [branding, form]);

  const onFinish = async (values: { name: string; tagline: string; primary_color?: string | null }) => {
    setSaving(true);
    try {
      const tag = values.tagline?.trim() ?? "";
      const hex = values.primary_color?.trim();
      await patchCoachProfile({
        name: values.name.trim(),
        tagline: tag.length ? tag : null,
        primary_color: hex && hex.length ? hex : null,
      });
      await refresh();
      notification.success({ message: t("branding.saved") });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
      message.error(msg || t("branding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    try {
      await patchCoachProfile({ logo_media_asset_id: null });
      await refresh();
      notification.success({ message: t("branding.logoRemoved") });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
      message.error(msg || t("branding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (branding.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 24px 48px" }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        {t("branding.title")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        {t("branding.subtitle")}
      </Typography.Paragraph>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item
            name="name"
            label={t("branding.displayName")}
            rules={[{ required: true, message: t("branding.nameRequired") }]}
          >
            <Input maxLength={255} showCount />
          </Form.Item>
          <Form.Item name="tagline" label={t("branding.tagline")}>
            <Input maxLength={500} showCount placeholder={t("branding.taglinePh")} />
          </Form.Item>
          <Form.Item
            name="primary_color"
            label={t("branding.accentColor")}
            getValueFromEvent={(color) => {
              if (color == null) return null;
              if (typeof color === "string") return color;
              // antd Color object
              return color.toHexString?.() ?? null;
            }}
          >
            <ColorPicker
              showText
              format="hex"
              disabledAlpha
              allowClear
              presets={[
                { label: "Teal", colors: ["#0d9488", "#14b8a6", "#2dd4bf"] },
                { label: "Blue", colors: ["#2563eb", "#3b82f6", "#0ea5e9"] },
              ]}
            />
          </Form.Item>

          <Form.Item label={t("branding.logo")}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {branding.logoUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img
                    src={mediaSrc(branding.logoUrl)}
                    alt=""
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: "contain",
                      borderRadius: 8,
                      border: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
                      padding: 8,
                      background: "var(--ant-color-bg-container, #fff)",
                    }}
                  />
                  <Button danger onClick={() => void removeLogo()} disabled={saving || uploading}>
                    {t("branding.removeLogo")}
                  </Button>
                </div>
              ) : (
                <Typography.Text type="secondary">{t("branding.noLogo")}</Typography.Text>
              )}
              <Upload
                accept="image/jpeg,image/png,image/webp,image/gif"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  void (async () => {
                    setUploading(true);
                    try {
                      const asset = await uploadMediaFile(file);
                      await patchCoachProfile({ logo_media_asset_id: asset.id });
                      await refresh();
                      notification.success({ message: t("branding.logoUpdated") });
                    } catch (e: unknown) {
                      const msg =
                        e && typeof e === "object" && "message" in e
                          ? String((e as { message: unknown }).message)
                          : "";
                      message.error(msg || t("branding.uploadFailed"));
                    } finally {
                      setUploading(false);
                    }
                  })();
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading} disabled={saving}>
                  {t("branding.uploadLogo")}
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              {t("actions.save")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
