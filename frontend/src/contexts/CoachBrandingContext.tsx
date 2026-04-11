import { ConfigProvider } from "antd";
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

/** Merges coach accent color into Ant Design theme (nested ConfigProvider). */
export function BrandedAntdOverride({ children }: { children: ReactNode }) {
  const { branding } = useCoachBranding();
  const { mode } = useThemeMode();
  const theme = useMemo(() => {
    const primary = branding.primaryColor?.trim();
    if (!primary) return undefined;
    return {
      token: { colorPrimary: primary },
      components: {
        Button: {
          primaryShadow:
            mode === "dark" ? "0 2px 0 rgba(0, 0, 0, 0.2)" : `0 2px 0 ${primary}33`,
        },
      },
    };
  }, [branding.primaryColor, mode]);

  if (!theme) return <>{children}</>;
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
