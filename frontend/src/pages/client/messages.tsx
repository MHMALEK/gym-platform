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
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useClientMe } from "../../contexts/ClientMeContext";
import {
  apiClientMessages,
  apiClientSendMessage,
  type ClientChatMessage,
} from "../../lib/clientPortalApi";

export function ClientMessagesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { me } = useClientMe();
  const [items, setItems] = useState<ClientChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setItems(await apiClientMessages());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await apiClientSendMessage(text);
      setItems((prev) => [...prev, msg]);
      setInput("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const coachBubble = {
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

  const clientBubble = {
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

  return (
    <Stack spacing={1.5} sx={{ height: "calc(100dvh - 140px)", minHeight: 360 }}>
      <Box>
        <Typography variant="h5">{t("clientPortal.messagesTitle")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.messagesSubtitle", { name: me?.coach_name ?? "" })}
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", flex: 1, alignItems: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            pr: 0.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            p: 1.5,
            bgcolor: "background.paper",
          }}
        >
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
              {t("clientPortal.messagesEmpty")}
            </Typography>
          ) : (
            items.map((m) => (
              <Box
                key={m.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  ...(m.sender_type === "client" ? clientBubble : coachBubble),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                  {m.sender_type === "client"
                    ? t("clientPortal.messagesYou")
                    : t("clientPortal.messagesCoach")}{" "}
                  · {dayjs(m.created_at).format("MMM D, h:mm A")}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
                  {m.body}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          placeholder={t("clientPortal.messagesPlaceholder")}
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
          {t("clientPortal.messagesSend")}
        </Button>
      </Stack>
    </Stack>
  );
}
