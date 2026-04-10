import { SnippetsOutlined } from "@ant-design/icons";
import { Alert, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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
          <Space wrap size="small">
            <Button
              type="primary"
              size="small"
              icon={<SnippetsOutlined />}
              onClick={() =>
                navigate({ pathname: `/clients/show/${clientId}`, hash: "workout" })
              }
            >
              {t("clients.plans.openWorkoutTab")}
            </Button>
            <Link to={to}>
              <Button size="small">{t("clients.plans.openDedicatedPage")}</Button>
            </Link>
          </Space>
        </Space>
      }
    />
  );
}
