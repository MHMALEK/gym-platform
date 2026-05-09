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

  /** Heavier shadow used by overlay-like surfaces (e.g. menus, popovers). */
  const elevatedShadow =
    mode === "dark"
      ? "0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 16px -4px rgba(0, 0, 0, 0.45)"
      : "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.08)";

  /** In-app links stay light and quiet; orange is only used for hover/focus. */
  const linkColor = mode === "dark" ? "#e5e7eb" : "#111113";
  const linkHover = mode === "dark" ? brand.primaryHover : brand.primaryActive;

  return createTheme({
    direction,
    palette: {
      mode,
      primary: { main: primary },
      /** Keep secondary neutral; avoid colorful chrome. */
      secondary: { main: mode === "dark" ? "#d4d4d8" : "#52525b" },
      success: { main: mode === "dark" ? "#22c55e" : "#16a34a" },
      warning: { main: mode === "dark" ? "#f59e0b" : "#d97706" },
      error: { main: mode === "dark" ? "#f87171" : "#dc2626" },
      info: { main: mode === "dark" ? "#d4d4d8" : "#52525b" },
      divider: mode === "dark" ? "rgba(255, 255, 255, 0.10)" : "rgba(17, 17, 19, 0.08)",
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
          "a:not(.MuiButton-root):not(.MuiIconButton-root):not(.MuiTab-root)": {
            color: linkColor,
            textDecoration: "none",
            fontWeight: 500,
            "&:visited": {
              color: linkColor,
            },
            "&:hover": {
              color: linkHover,
              textDecoration: "underline",
            },
          },
        },
      },
      MuiLink: {
        defaultProps: {
          underline: "hover",
        },
        styleOverrides: {
          root: {
            fontWeight: 500,
            color: linkColor,
            "&:visited": {
              color: linkColor,
            },
            "&:hover": {
              color: linkHover,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            "&.MuiPaper-outlined": {
              border: "none",
              boxShadow: "none",
            },
          },
          elevation1: {
            boxShadow: elevatedShadow,
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: "none",
            boxShadow: "none",
            backgroundColor: brand.surface,
            "&.MuiPaper-outlined": {
              border: "none",
            },
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "#111114" : "#ffffff",
            color: brand.text,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(17, 17, 19, 0.14)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: brand.primaryHover,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primary,
            },
          },
          input: {
            "&::placeholder": {
              color: brand.textSecondary,
              opacity: 0.82,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: brand.textSecondary,
            "&.Mui-focused": {
              color: primary,
            },
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
