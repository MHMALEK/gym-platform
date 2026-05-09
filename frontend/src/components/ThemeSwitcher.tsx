import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { Moon, Sun } from "lucide-react";
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
        sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}
      >
        {isDark ? (
          <Sun size={16} strokeWidth={2} />
        ) : (
          <Moon size={16} strokeWidth={2} />
        )}
      </IconButton>
    </Tooltip>
  );
}
