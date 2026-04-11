import { createTheme, type Theme } from "@mui/material/styles";

import { coachBrand, coachBrandLight } from "./brand";
import type { ThemeMode } from "./ThemeModeContext";

/** App-wide MUI theme (font + light/dark coach palette). Optional API `primaryOverride` is merged in the branded layout shell. */
export function buildCoachMuiTheme(
  fontFamily: string,
  mode: ThemeMode,
  direction: "ltr" | "rtl",
  primaryOverride?: string | null,
): Theme {
  const brand = mode === "dark" ? coachBrand : coachBrandLight;
  const primary = (primaryOverride?.trim() || brand.primary) as string;

  const cardShadow =
    mode === "dark"
      ? "0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 16px -4px rgba(0, 0, 0, 0.45)"
      : "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.08)";

  return createTheme({
    direction,
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: mode === "dark" ? "#38bdf8" : "#0284c7" },
      success: { main: mode === "dark" ? "#22c55e" : "#16a34a" },
      warning: { main: mode === "dark" ? "#f59e0b" : "#d97706" },
      error: { main: mode === "dark" ? "#f87171" : "#dc2626" },
      info: { main: mode === "dark" ? "#38bdf8" : "#0284c7" },
      divider: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)",
      text: {
        primary: brand.text,
        secondary: brand.textSecondary,
        disabled: mode === "dark" ? "rgba(148, 163, 184, 0.55)" : "rgba(100, 116, 139, 0.65)",
      },
      background: {
        default: brand.layoutBg,
        paper: brand.surface,
      },
      action: {
        hover: brand.primaryBgHover,
        selected: brand.primaryBgSoft,
      },
    },
    typography: {
      fontFamily,
      fontSize: 14,
      button: { fontWeight: 500, textTransform: "none" },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: brand.layoutBg,
            color: brand.text,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          elevation1: {
            boxShadow: cardShadow,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: cardShadow,
            backgroundColor: brand.surface,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: brand.surfaceElevated,
            backgroundImage: "none",
            borderBottom: `1px solid ${brand.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: brand.surfaceElevated,
            borderRight: `1px solid ${brand.border}`,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: brand.surfaceElevated,
            fontWeight: 600,
          },
        },
      },
    },
  });
}
