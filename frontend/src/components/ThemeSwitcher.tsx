import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { useThemeMode } from "../theme/ThemeModeContext";

/** Toggles light / dark shell; preference is stored in localStorage. */
export function ThemeSwitcher() {
  const { mode, toggleMode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}>
      <Button
        type="text"
        size="small"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggleMode}
        aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      />
    </Tooltip>
  );
}
