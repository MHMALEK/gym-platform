import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography, theme } from "antd";
import { useTranslation } from "react-i18next";

import { coachBrand } from "../theme/brand";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function LoginPage() {
  const { mutate: login, isLoading } = useLogin();
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `linear-gradient(165deg, ${coachBrand.layoutBg} 0%, #ecfeff 38%, #f0fdf4 72%, ${coachBrand.layoutBg} 100%)`,
      }}
    >
      <Card
        title={t("login.title")}
        style={{
          width: "min(420px, 100%)",
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary ?? "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        {devAuth ? (
          <>
            <Typography.Paragraph type="secondary">
              {t("login.devHint")} <code>DEV_BYPASS_AUTH</code>.
            </Typography.Paragraph>
            <Button type="primary" block loading={isLoading} onClick={() => login({})}>
              {t("login.devLogin")}
            </Button>
          </>
        ) : (
          <Form
            layout="vertical"
            onFinish={(v) => login({ email: v.email, password: v.password })}
          >
            <Form.Item name="email" label={t("login.email")} rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label={t("login.password")} rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              {t("login.signIn")}
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
