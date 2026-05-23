import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { BaseRecord } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { apiPrefix, authBearerHeaders, httpErrorFromResponse } from "../../lib/api";
import { ClientMessagesPanel } from "../clients/ClientMessagesPanel";

function clientName(r: BaseRecord): string {
  return String((r as Record<string, unknown>).name ?? "").trim() || "—";
}

/**
 * WhatsApp-style hub: roster list + conversation. Selection is stored in `?client=<id>`.
 */
export function CoachMessagesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const clientParam = searchParams.get("client");
  const selectedId = clientParam ? Number(clientParam) : Number.NaN;
  const hasSelection = Number.isFinite(selectedId) && selectedId > 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const res = await fetch(`${apiPrefix}/clients?limit=200&offset=0`, {
          headers: authBearerHeaders(),
        });
        const raw = await res.text();
        if (!res.ok) throw httpErrorFromResponse(res, raw);
        const data = JSON.parse(raw) as { items?: BaseRecord[] };
        if (!cancelled) setRows(data.items ?? []);
      } catch {
        if (!cancelled) setIsError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => clientName(r).toLowerCase().includes(q));
  }, [rows, query]);

  const selectedRecord = useMemo(
    () => (hasSelection ? rows.find((r) => (r.id as number) === selectedId) : undefined),
    [rows, selectedId, hasSelection],
  );
  const selectedLabel = selectedRecord
    ? clientName(selectedRecord)
    : hasSelection
      ? `#${selectedId}`
      : t("messagesHub.chatHeading");

  const selectClient = (id: number) => {
    setSearchParams({ client: String(id) });
  };

  const clearSelection = () => {
    setSearchParams({});
  };

  const listPane = (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: isMd ? "0 0 320px" : 1,
        maxWidth: isMd ? 360 : "none",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t("messagesHub.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t("messagesHub.loadingClients")}
          </Typography>
        ) : isError ? (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            {t("messagesHub.loadClientsError")}
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t("messagesHub.noClientsMatch")}
          </Typography>
        ) : (
          <List dense disablePadding>
            {filtered.map((r) => {
              const id = r.id as number;
              const name = clientName(r);
              const selected = hasSelection && id === selectedId;
              return (
                <ListItemButton
                  key={id}
                  selected={selected}
                  onClick={() => selectClient(id)}
                  sx={{
                    alignItems: "flex-start",
                    py: 1.25,
                    "&.Mui-selected": {
                      bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 40, height: 40, fontSize: 15 }}>{name.slice(0, 2).toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={name}
                    secondary={t("messagesHub.openThread")}
                    primaryTypographyProps={{ fontWeight: selected ? 600 : 500, noWrap: true }}
                    secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );

  const chatPane = (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {!hasSelection ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            bgcolor: (th) => alpha(th.palette.text.primary, 0.02),
          }}
        >
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {isMd ? t("messagesHub.pickClientDesktop") : t("messagesHub.pickClientMobile")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2, pt: isMd ? 2 : 1, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {!isMd ? (
            <MobileChatHeader title={selectedLabel} onBack={clearSelection} />
          ) : (
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
              {selectedLabel}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <ClientMessagesPanel key={selectedId} clientId={selectedId} />
          </Box>
        </Box>
      )}
    </Paper>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        /** Fill viewport under top bar + main padding (approx). */
        minHeight: { xs: "min(70dvh, 640px)", md: "calc(100vh - 56px - 96px)" },
        maxHeight: { md: "calc(100vh - 56px - 96px)" },
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        {t("messagesHub.pageTitle")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          flex: 1,
          minHeight: 0,
        }}
      >
        {isMd ? (
          <>
            {listPane}
            {chatPane}
          </>
        ) : hasSelection ? (
          chatPane
        ) : (
          listPane
        )}
      </Box>
    </Box>
  );
}

function MobileChatHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
      <IconButton edge="start" onClick={onBack} aria-label="Back" size="small">
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
        {title}
      </Typography>
    </Box>
  );
}
