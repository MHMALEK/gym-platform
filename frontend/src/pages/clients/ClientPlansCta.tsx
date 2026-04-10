import { SnippetsOutlined } from "@ant-design/icons";
import { Alert, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function clientWorkoutDietPath(clientId: number | string): string {
  return `/clients/show/${clientId}/workout-diet-plans`;
}

type Props = {
  clientId: number;
  /** Tighter layout when nested in forms */
  compact?: boolean;
};

/** Call-to-action to open the dedicated workout & diet plans page for this client. */
export function ClientPlansCta({ clientId, compact }: Props) {
  const { t } = useTranslation();
  const to = clientWorkoutDietPath(clientId);
  return (
    <Alert
      type="info"
      showIcon
      icon={<SnippetsOutlined />}
      style={{ marginTop: compact ? 12 : 16 }}
      message={t("clients.plans.ctaTitle")}
      description={
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <span>{t("clients.plans.ctaBody")}</span>
          <Link to={to}>
            <Button type="primary" size="small" icon={<SnippetsOutlined />}>
              {t("clients.plans.openDedicatedPage")}
            </Button>
          </Link>
        </Space>
      }
    />
  );
}
