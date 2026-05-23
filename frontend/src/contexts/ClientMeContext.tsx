import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { apiClientMe, type ClientMe } from "../lib/authApi";

type ClientMeContextValue = {
  me: ClientMe | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ClientMeContext = createContext<ClientMeContextValue | null>(null);

export function ClientMeProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [me, setMe] = useState<ClientMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMe(await apiClientMe());
    } catch (e: unknown) {
      setMe(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, error, refresh }),
    [me, loading, error, refresh],
  );

  if (loading && !me) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !me) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
        <Typography color="error">{error || t("clientPortal.loadFailed")}</Typography>
      </Box>
    );
  }

  return <ClientMeContext.Provider value={value}>{children}</ClientMeContext.Provider>;
}

export function useClientMe(): ClientMeContextValue {
  const ctx = useContext(ClientMeContext);
  if (!ctx) throw new Error("useClientMe must be used within ClientMeProvider");
  return ctx;
}
