import { Alert } from "antd";
import { useTranslation } from "react-i18next";

/** Shown on Create until the client exists (invoices/membership need a client id). */
export function ClientFinancialLockedPlaceholder() {
  const { t } = useTranslation();
  return (
    <Alert
      type="info"
      showIcon
      message={t("clients.create.saveFirstTitle")}
      description={t("clients.create.saveFirstDescription")}
      style={{ maxWidth: 560 }}
    />
  );
}
