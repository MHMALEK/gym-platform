import LogoutIcon from "@mui/icons-material/Logout";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Apple, Dumbbell, FileText, Home, MessageCircle } from "lucide-react";
import { useLogout } from "@refinedev/core";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { ClientMeProvider, useClientMe } from "../../contexts/ClientMeContext";

function ClientShellInner({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { me } = useClientMe();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const navValue = (() => {
    const p = location.pathname;
    if (p.startsWith("/client/messages")) return "messages";
    if (p.startsWith("/client/plans/workout")) return "workout";
    if (p.startsWith("/client/plans/nutrition")) return "nutrition";
    if (p.startsWith("/client/invoices")) return "invoices";
    return "home";
  })();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {me?.coach_name ?? t("clientPortal.title")}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {me?.name}
            </Typography>
          </Box>
          <IconButton aria-label={t("clientPortal.signOut")} onClick={() => logout()} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
        {children ?? <Outlet />}
      </Box>

      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}
        elevation={8}
      >
        <BottomNavigation
          showLabels
          value={navValue}
          onChange={(_, value: string) => {
            if (value === "home") navigate("/client");
            if (value === "messages") navigate("/client/messages");
            if (value === "workout") navigate("/client/plans/workout");
            if (value === "nutrition") navigate("/client/plans/nutrition");
            if (value === "invoices") navigate("/client/invoices");
          }}
        >
          <BottomNavigationAction
            label={t("clientPortal.nav.home")}
            value="home"
            icon={<Home size={20} strokeWidth={2} />}
          />
          <BottomNavigationAction
            label={t("clientPortal.nav.messages")}
            value="messages"
            icon={<MessageCircle size={20} strokeWidth={2} />}
          />
          <BottomNavigationAction
            label={t("clientPortal.nav.workout")}
            value="workout"
            icon={<Dumbbell size={20} strokeWidth={2} />}
          />
          <BottomNavigationAction
            label={t("clientPortal.nav.nutrition")}
            value="nutrition"
            icon={<Apple size={20} strokeWidth={2} />}
          />
          <BottomNavigationAction
            label={t("clientPortal.nav.invoices")}
            value="invoices"
            icon={<FileText size={20} strokeWidth={2} />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

export function ClientShell({ children }: { children?: ReactNode }) {
  return (
    <ClientMeProvider>
      <ClientShellInner>{children}</ClientShellInner>
    </ClientMeProvider>
  );
}
