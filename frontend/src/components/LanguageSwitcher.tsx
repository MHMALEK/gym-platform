import { Select } from "antd";
import { useTranslation } from "react-i18next";

/** Compact language control; Persian default, English ready for future use. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const value = i18n.language.startsWith("fa") ? "fa" : "en";

  return (
    <Select
      size="small"
      value={value}
      onChange={(v) => void i18n.changeLanguage(v)}
      options={[
        { value: "fa", label: t("language.fa") },
        { value: "en", label: t("language.en") },
      ]}
      style={{ width: 118 }}
      aria-label={t("language.switch")}
    />
  );
}
