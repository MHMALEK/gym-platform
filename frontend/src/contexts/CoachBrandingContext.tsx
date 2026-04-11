import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiPrefix, authHeaders } from "../lib/api";
import { useThemeMode } from "../theme/ThemeModeContext";

export type CoachBrandingState = {
  name: string;
  tagline: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  logoMediaAssetId: number | null;
  loading: boolean;
};

const initial: CoachBrandingState = {
  name: "",
  tagline: null,
  primaryColor: null,
  logoUrl: null,
  logoMediaAssetId: null,
  loading: true,
};

type CoachBrandingContextValue = {
  branding: CoachBrandingState;
  refresh: () => Promise<void>;
};

const CoachBrandingContext = createContext<CoachBrandingContextValue | null>(null);

export function CoachBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<CoachBrandingState>(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`${apiPrefix}/me`, { headers: authHeaders() });
    if (!res.ok) {
      setBranding((b) => ({ ...b, loading: false }));
      return;
    }
    const u: {
      name: string;
      tagline?: string | null;
      primary_color?: string | null;
      logo_url?: string | null;
      logo_media_asset_id?: number | null;
    } = await res.json();
    setBranding({
      name: u.name,
      tagline: u.tagline ?? null,
      primaryColor: u.primary_color ?? null,
      logoUrl: u.logo_url ?? null,
      logoMediaAssetId: u.logo_media_asset_id ?? null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ branding, refresh }), [branding, refresh]);

  return <CoachBrandingContext.Provider value={value}>{children}</CoachBrandingContext.Provider>;
}

export function useCoachBranding(): CoachBrandingContextValue {
  const ctx = useContext(CoachBrandingContext);
  if (!ctx) {
    throw new Error("useCoachBranding must be used within CoachBrandingProvider");
  }
  return ctx;
}

const rtlCache = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

const ltrCache = createCache({
  key: "muiltr",
});

/** Emotion cache: RTL stylis plugin for Persian, plain LTR for English. */
export function EmotionDirectionBridge({ direction, children }: { direction: "ltr" | "rtl"; children: ReactNode }) {
  return <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>{children}</CacheProvider>;
}

/** Merges coach accent from API into the active MUI theme (nested ThemeProvider). */
export function BrandedMuiOverride({ children }: { children: ReactNode }) {
  const { branding } = useCoachBranding();
  const parentTheme = useTheme();

  const theme = useMemo(() => {
    const primary = branding.primaryColor?.trim();
    if (!primary) return null;
    return createTheme(parentTheme, {
      palette: {
        primary: { main: primary },
      },
    });
  }, [branding.primaryColor, parentTheme]);

  if (!theme) return <>{children}</>;
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
