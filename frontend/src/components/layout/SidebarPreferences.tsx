import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { Globe, LogOut, Moon, MoreHorizontal, Sun } from "lucide-react";
import { useLogout } from "@refinedev/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useThemeMode } from "../../theme/ThemeModeContext";

/** Compact sidebar footer — one menu for language, theme, and sign out. */
export function SidebarPreferences() {
  const { t, i18n } = useTranslation();
  const { mutate: logout } = useLogout();
  const { mode, toggleMode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const isDark = mode === "dark";
  const lang = i18n.language.startsWith("fa") ? "fa" : "en";
  const logoutLabel = t("auth.logout") !== "auth.logout" ? t("auth.logout") : "Sign out";

  return (
    <>
      <Tooltip title={t("nav.preferences")} placement="top">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t("nav.preferences")}
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}
        >
          <MoreHorizontal size={18} strokeWidth={2} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        <MenuItem
          onClick={() => {
            void i18n.changeLanguage(lang === "fa" ? "en" : "fa");
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <Globe size={16} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText
            primary={t("language.switch")}
            secondary={lang === "fa" ? t("language.en") : t("language.fa")}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            toggleMode();
            setAnchor(null);
          }}
        >
          <ListItemIcon>{isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}</ListItemIcon>
          <ListItemText primary={isDark ? t("theme.switchToLight") : t("theme.switchToDark")} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout();
          }}
        >
          <ListItemIcon>
            <LogOut size={16} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText primary={logoutLabel} />
        </MenuItem>
      </Menu>
    </>
  );
}
