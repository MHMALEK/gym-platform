import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLogout, useMenu } from "@refinedev/core";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { useCoachBranding } from "../../contexts/CoachBrandingContext";
import { mediaSrc } from "../../lib/exerciseMediaApi";
import { BrandMark } from "../BrandMark";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ThemeSwitcher } from "../ThemeSwitcher";

const SIDEBAR_WIDTH = 264;

/**
 * Modern application shell — replaces Refine's `ThemedLayoutV2`.
 * Sidebar + topbar, with the same menu data driven by `useMenu`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            borderRight: 1,
            borderColor: "divider",
          }}
        >
          <SidebarContent />
        </Box>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              bgcolor: "background.paper",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          <SidebarContent />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar onOpenMenu={() => setMobileOpen(true)} showMenuButton={!isDesktop} />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 3, md: 5 },
            py: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function SidebarContent() {
  const { t } = useTranslation();
  const { branding } = useCoachBranding();
  const { menuItems, selectedKey } = useMenu();

  const displayName = branding.loading ? t("app.title") : branding.name || t("app.title");

  return (
    <>
      <Box
        sx={{
          px: 2,
          pt: 2.25,
          pb: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          {branding.logoUrl && !branding.loading ? (
            <Box
              component="img"
              src={mediaSrc(branding.logoUrl)}
              alt=""
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <Box sx={{ color: "primary.main", display: "inline-flex", flexShrink: 0 }}>
              <BrandMark size={32} radius={6} />
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
            {branding.tagline && !branding.loading ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25, lineHeight: 1.2 }}
              >
                {branding.tagline}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: 1.25,
          py: 1.5,
        }}
      >
        <Stack spacing={0.25}>
          {menuItems.map((item) => (
            <NavItem
              key={item.key ?? item.name}
              to={item.route ?? "/"}
              label={(item.label as string) ?? item.name}
              icon={item.icon as ReactNode}
              active={selectedKey === item.key}
            />
          ))}
        </Stack>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <SidebarFooter />
    </>
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Box
      component={Link}
      to={to}
      sx={(theme) => ({
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 0.85,
        borderRadius: 1.25,
        textDecoration: "none",
        color: active ? "primary.main" : "text.secondary",
        bgcolor: active ? "action.selected" : "transparent",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        lineHeight: 1.4,
        transition: theme.transitions.create(["background-color", "color"], {
          duration: theme.transitions.duration.shortest,
        }),
        "& .nav-icon": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          color: active ? "primary.main" : "text.secondary",
          flexShrink: 0,
          fontSize: 18,
        },
        "&:hover": {
          bgcolor: active ? "action.selected" : "action.hover",
          color: active ? "primary.main" : "text.primary",
          "& .nav-icon": {
            color: active ? "primary.main" : "text.primary",
          },
        },
      })}
    >
      {active ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: 2,
            bgcolor: "primary.main",
          }}
        />
      ) : null}
      <Box className="nav-icon">{icon}</Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

function SidebarFooter() {
  const { t } = useTranslation();
  const { mutate: logout } = useLogout();

  return (
    <Stack spacing={1.25} sx={{ px: 2, py: 1.5 }}>
      <LanguageSwitcher layout="sider" />
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Tooltip title={t("auth.logout") !== "auth.logout" ? t("auth.logout") : "Sign out"}>
          <Button
            size="small"
            color="inherit"
            onClick={() => logout()}
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              minWidth: 0,
              px: 1,
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            {t("auth.logout") !== "auth.logout" ? t("auth.logout") : "Sign out"}
          </Button>
        </Tooltip>
        <ThemeSwitcher />
      </Stack>
    </Stack>
  );
}

function Topbar({ onOpenMenu, showMenuButton }: { onOpenMenu: () => void; showMenuButton: boolean }) {
  const { menuItems, selectedKey } = useMenu();
  const current = useMemo(
    () => menuItems.find((m) => m.key === selectedKey),
    [menuItems, selectedKey],
  );
  const title = (current?.label as string) ?? "";

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: { xs: 2, sm: 3, md: 5 },
        height: 56,
        bgcolor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      {showMenuButton ? (
        <IconButton edge="start" onClick={onOpenMenu} size="small" aria-label="Open menu">
          <MenuIcon />
        </IconButton>
      ) : null}
      <Typography
        component="h1"
        sx={{
          fontSize: 15,
          fontWeight: 600,
          color: "text.primary",
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}
