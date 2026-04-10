import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography } from "antd";
import { useTranslation } from "react-i18next";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function LoginPage() {
  const { mutate: login, isLoading } = useLogin();
  const { t } = useTranslation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}
    >
      <Card title={t("login.title")} style={{ width: 400 }}>
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
