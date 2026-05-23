import SendIcon from "@mui/icons-material/Send";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authBearerHeaders, authHeaders, httpErrorFromResponse } from "../../lib/api";

type ChatRow = {
  id: number;
  sender_type: "coach" | "client";
  body: string;
  created_at: string;
};

type ListPayload = { items: ChatRow[] };

export function ClientMessagesPanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [items, setItems] = useState<ChatRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const maxId = useMemo(() => (items.length ? Math.max(...items.map((m) => m.id)) : 0), [items]);

  const mergeIncoming = useCallback((incoming: ChatRow[]) => {
    setItems((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      const next = [...prev];
      for (const m of incoming) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          next.push(m);
        }
      }
      next.sort((a, b) => a.id - b.id);
      return next;
    });
  }, []);

  const loadInitial = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/messages`, {
        headers: authBearerHeaders(),
      });
      const raw = await res.text();
      if (!res.ok) throw httpErrorFromResponse(res, raw);
      const data = JSON.parse(raw) as ListPayload;
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const poll = useCallback(async () => {
    if (!maxId) return;
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/messages?after_id=${maxId}`, {
        headers: authBearerHeaders(),
      });
      const raw = await res.text();
      if (!res.ok) return;
      const data = JSON.parse(raw) as ListPayload;
      if (data.items?.length) mergeIncoming(data.items);
    } catch {
      /* ignore transient poll errors */
    }
  }, [clientId, maxId, mergeIncoming]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void poll();
    }, 4000);
    return () => window.clearInterval(id);
  }, [poll]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${apiPrefix}/clients/${clientId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ body: text }),
      });
      const raw = await res.text();
      if (!res.ok) throw httpErrorFromResponse(res, raw);
      const data = JSON.parse(raw) as { message: ChatRow };
      mergeIncoming([data.message]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const coachBubble = {
    alignSelf: "flex-end" as const,
    maxWidth: "92%",
    px: 1.5,
    py: 1,
    borderRadius: 2,
    bgcolor:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.primary.main, 0.28)
        : alpha(theme.palette.primary.main, 0.14),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
  };

  const clientBubble = {
    alignSelf: "flex-start" as const,
    maxWidth: "92%",
    px: 1.5,
    py: 1,
    borderRadius: 2,
    bgcolor:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.grey[400], 0.12)
        : alpha(theme.palette.grey[800], 0.06),
    border: `1px solid ${theme.palette.divider}`,
  };

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: 220,
            maxHeight: 420,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            pr: 0.5,
          }}
        >
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t("clients.show.messagesEmpty")}
            </Typography>
          ) : (
            items.map((m) => (
              <Box
                key={m.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  ...(m.sender_type === "coach" ? coachBubble : clientBubble),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                  {m.sender_type === "coach"
                    ? t("clients.show.messagesYouLabel")
                    : t("clients.show.messagesClientLabel")}{" "}
                  · {dayjs(m.created_at).format("MMM D, YYYY h:mm A")}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
                  {m.body}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      )}

      <Typography variant="caption" color="text.secondary">
        {t("clients.show.messagesPollHint")}
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          placeholder={t("clients.show.messagesPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={sending}
          size="small"
        />
        <Button
          variant="contained"
          endIcon={<SendIcon />}
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "flex-start" } }}
        >
          {t("clients.show.messagesSend")}
        </Button>
      </Stack>
    </Stack>
  );
}
