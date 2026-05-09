import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLogout, useMenu } from "@refinedev/core";
import { LogOut, Menu as MenuIcon } from "lucide-react";
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

/**
 * Nav grouping. Each menu item (by Refine resource `name`) is sorted into
 * a group; items not listed fall into a trailing "Other" group so a new
 * resource never silently disappears from the sidebar.
 */
type NavGroup = { id: string; labelKey: string; items: string[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    labelKey: "nav.groupWorkspace",
    items: ["coach-desk", "dashboard", "coach-assistant"],
  },
  {
    id: "clients",
    labelKey: "nav.groupClients",
    items: ["clients", "invoices"],
  },
  {
    id: "programs",
    labelKey: "nav.groupPrograms",
    items: ["training-plans", "plan-templates", "exercises", "nutrition-templates"],
  },
  {
    id: "library",
    labelKey: "nav.groupLibrary",
    items: [
      "directory-exercises",
      "directory-training-plans",
      "directory-nutrition-templates",
    ],
  },
  {
    id: "settings",
    labelKey: "nav.groupSettings",
    items: ["branding"],
  },
];

function SidebarContent() {
  const { t } = useTranslation();
  const { branding } = useCoachBranding();
  const { menuItems, selectedKey } = useMenu();

  const displayName = branding.loading ? t("app.title") : branding.name || t("app.title");

  /** Bucket menu items into known groups; unknown ones land in "Other" so nothing disappears. */
  const grouped = useMemo(() => {
    const known = new Set<string>();
    const groups = NAV_GROUPS.map((g) => {
      const items = g.items
        .map((name) => menuItems.find((m) => m.name === name))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));
      items.forEach((m) => known.add(m.name));
      return { ...g, resolved: items };
    }).filter((g) => g.resolved.length > 0);

    const others = menuItems.filter((m) => !known.has(m.name));
    if (others.length > 0) {
      groups.push({
        id: "other",
        labelKey: "nav.groupOther",
        items: [],
        resolved: others,
      });
    }
    return groups;
  }, [menuItems]);

  return (
    <>
      <Box sx={{ px: 2, pt: 2.25, pb: 1.5 }}>
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
        {grouped.map((group, gi) => {
          const label = t(group.labelKey);
          const showLabel = label && label !== group.labelKey;
          return (
            <Box key={group.id} sx={{ mb: gi === grouped.length - 1 ? 0 : 1.5 }}>
              {showLabel ? (
                <Typography
                  component="div"
                  sx={{
                    px: 1.25,
                    pt: gi === 0 ? 0 : 0.75,
                    pb: 0.5,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                  }}
                >
                  {label}
                </Typography>
              ) : null}
              <Stack spacing={0.25}>
                {group.resolved.map((item) => (
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
          );
        })}
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
  const logoutLabel = t("auth.logout") !== "auth.logout" ? t("auth.logout") : "Sign out";

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: 1.5, py: 1.25, minHeight: 48 }}
    >
      <Tooltip title={logoutLabel} placement="top">
        <Button
          size="small"
          onClick={() => logout()}
          startIcon={<LogOut size={15} strokeWidth={2} />}
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            textTransform: "none",
            minWidth: 0,
            px: 1,
            flex: 1,
            justifyContent: "flex-start",
            "&:hover": { color: "text.primary", bgcolor: "action.hover" },
          }}
        >
          {logoutLabel}
        </Button>
      </Tooltip>
      <Box sx={{ flexShrink: 0 }}>
        <LanguageSwitcher />
      </Box>
      <ThemeSwitcher />
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
          <MenuIcon size={18} strokeWidth={2} />
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
      {import.meta.env.DEV ? (
        <Chip
          label="Dev"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ height: 22, fontSize: 10, fontWeight: 700, flexShrink: 0 }}
        />
      ) : null}
    </Box>
  );
}
