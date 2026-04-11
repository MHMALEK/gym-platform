import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";

import { useThemeMode } from "../theme/ThemeModeContext";

/** Toggles light / dark shell; preference is stored in localStorage. */
export function ThemeSwitcher() {
  const { mode, toggleMode } = useThemeMode();
  const { t } = useTranslation();
  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}>
      <IconButton
        size="small"
        onClick={toggleMode}
        aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
        color="inherit"
      >
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
