import { useGetIdentity } from "@refinedev/core";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ArrowUp, ChevronDown, History, MessageSquarePlus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "../../components/layout/PageHeader";
import { apiPrefix, authHeaders } from "../../lib/api";
import {
  COACH_ASSISTANT_MAX_API_MESSAGES,
  addSessionToWorkspace,
  coachSessionTitleFromFirstMessage,
  createCoachChatSession,
  loadCoachAssistantWorkspace,
  newCoachAssistantTurn,
  removeSessionFromWorkspace,
  saveCoachAssistantWorkspace,
  storageKeyForCoach,
  updateSessionInWorkspace,
  type CoachAssistantWorkspace,
  type CoachChatSession,
} from "../../lib/coachAssistantSession";

/** Matches `authProvider.getIdentity` payload from `/me`. */
type CoachIdentity = {
  id: string | number;
  name?: string;
  email?: string;
  avatar?: string;
};

function isCoachIdentity(v: unknown): v is CoachIdentity {
  if (!v || typeof v !== "object") return false;
  const id = (v as { id?: unknown }).id;
  return id != null && (typeof id === "string" || typeof id === "number");
}

function formatSessionDate(ts: number, locale: string): string {
  try {
    return new Date(ts).toLocaleString(locale.startsWith("fa") ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function CoachAssistantPage() {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const { data: identity, isLoading: identityLoading } = useGetIdentity();
  const { t, i18n } = useTranslation();
  const coachId =
    isCoachIdentity(identity) && String(identity.id) !== "" ? String(identity.id) : null;
  const storageKey = coachId ? storageKeyForCoach(coachId) : null;

  const [workspace, setWorkspace] = useState<CoachAssistantWorkspace | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevSessionRef = useRef<string | null>(null);

  const activeSession = useMemo(() => {
    if (!workspace) return undefined;
    return workspace.sessions.find((s) => s.id === workspace.activeSessionId);
  }, [workspace]);

  const messages = activeSession?.messages ?? [];
  const contextNote = activeSession?.context ?? "";

  useEffect(() => {
    if (identityLoading) return;
    prevSessionRef.current = null;
    if (!storageKey) {
      const s = createCoachChatSession(t("coachAssistant.newChatTitle"));
      setWorkspace({ v: 2, activeSessionId: s.id, sessions: [s] });
      setHydrated(true);
      return;
    }
    const w = loadCoachAssistantWorkspace(storageKey, {
      newChatTitle: t("coachAssistant.newChatTitle"),
      migratedSessionTitle: t("coachAssistant.migratedChatTitle"),
    });
    setWorkspace(w);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per coach; titles use t at load time
  }, [storageKey, identityLoading]);

  useEffect(() => {
    if (!hydrated || !storageKey || !workspace) return;
    saveCoachAssistantWorkspace(storageKey, workspace);
  }, [workspace, storageKey, hydrated]);

  useEffect(() => {
    if (!workspace) return;
    if (prevSessionRef.current === workspace.activeSessionId) return;
    prevSessionRef.current = workspace.activeSessionId;
    const s = workspace.sessions.find((x) => x.id === workspace.activeSessionId);
    setContextOpen(Boolean((s?.context ?? "").trim()));
  }, [workspace]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const selectSession = useCallback((id: string) => {
    setWorkspace((w) => (w ? { ...w, activeSessionId: id } : w));
    setSessionsDrawerOpen(false);
    setError(null);
  }, []);

  const newChat = useCallback(() => {
    const s = createCoachChatSession(t("coachAssistant.newChatTitle"));
    setWorkspace((w) => (w ? addSessionToWorkspace(w, s) : w));
    setInput("");
    setError(null);
    setSessionsDrawerOpen(false);
  }, [t]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setWorkspace((w) =>
        w ? removeSessionFromWorkspace(w, sessionId, t("coachAssistant.newChatTitle")) : w,
      );
      setSessionsDrawerOpen(false);
    },
    [t],
  );

  const clearCurrentChat = useCallback(() => {
    if (!workspace) return;
    const sid = workspace.activeSessionId;
    setWorkspace((w) =>
      w
        ? updateSessionInWorkspace(w, sid, {
            messages: [],
            context: "",
            updatedAt: Date.now(),
            title: t("coachAssistant.newChatTitle"),
          })
        : w,
    );
    setError(null);
  }, [workspace, t]);

  const setContextNote = useCallback((value: string) => {
    setWorkspace((w) => {
      if (!w) return w;
      return updateSessionInWorkspace(w, w.activeSessionId, { context: value, updatedAt: Date.now() });
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !workspace) return;
    setError(null);
    const sid = workspace.activeSessionId;
    const session = workspace.sessions.find((s) => s.id === sid);
    if (!session) return;
    const prevMessages = session.messages;
    const userTurn = newCoachAssistantTurn("user", text);
    const nextHistory = [...prevMessages, userTurn];
    const nextTitle =
      prevMessages.length === 0 ? coachSessionTitleFromFirstMessage(text) : session.title;

    setWorkspace((w) =>
      w
        ? updateSessionInWorkspace(w, sid, {
            messages: nextHistory,
            title: nextTitle,
            updatedAt: Date.now(),
          })
        : w,
    );
    setInput("");
    setLoading(true);

    const apiPayload = nextHistory
      .slice(-COACH_ASSISTANT_MAX_API_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    const ctx = (session.context ?? "").trim() || undefined;

    try {
      const res = await fetch(`${apiPrefix}/ai/coach-chat`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiPayload,
          ...(ctx ? { context: ctx } : {}),
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          const j = JSON.parse(raw) as { detail?: unknown };
          if (typeof j.detail === "string") detail = j.detail;
        } catch {
          /* keep raw */
        }
        setError(detail || t("coachAssistant.errorGeneric"));
        setWorkspace((w) =>
          w ? updateSessionInWorkspace(w, sid, { messages: prevMessages, updatedAt: Date.now() }) : w,
        );
        return;
      }
      const data = JSON.parse(raw) as { message?: string };
      const reply = (data.message ?? "").trim() || t("coachAssistant.emptyReply");
      const withAssistant = [...nextHistory, newCoachAssistantTurn("assistant", reply)];
      setWorkspace((w) =>
        w
          ? updateSessionInWorkspace(w, sid, {
              messages: withAssistant,
              updatedAt: Date.now(),
            })
          : w,
      );
      setTimeout(scrollToBottom, 100);
    } catch {
      setError(t("coachAssistant.networkError"));
      setWorkspace((w) =>
        w ? updateSessionInWorkspace(w, sid, { messages: prevMessages, updatedAt: Date.now() }) : w,
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, scrollToBottom, t, workspace]);

  const sessionList = (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Button
        fullWidth
        variant="contained"
        disableElevation
        startIcon={<MessageSquarePlus size={18} />}
        onClick={newChat}
        sx={{ mb: 1.5, textTransform: "none", py: 1 }}
      >
        {t("coachAssistant.newChat")}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 0.75, fontWeight: 600 }}>
        {t("coachAssistant.sessionsHeading")}
      </Typography>
      <List disablePadding dense sx={{ overflow: "auto", flex: 1, mx: -1 }}>
        {workspace?.sessions.map((s: CoachChatSession) => (
          <ListItem
            key={s.id}
            disablePadding
            secondaryAction={
              <IconButton
                edge="end"
                size="small"
                aria-label={t("coachAssistant.deleteSession")}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
                sx={{ mr: 0.25 }}
              >
                <X size={16} />
              </IconButton>
            }
            sx={{ mb: 0.25 }}
          >
            <ListItemButton
              selected={s.id === workspace?.activeSessionId}
              onClick={() => selectSession(s.id)}
              sx={{ borderRadius: 1, pr: 4 }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" noWrap fontWeight={600}>
                    {s.title}
                  </Typography>
                }
                secondary={formatSessionDate(s.updatedAt, i18n.language)}
                secondaryTypographyProps={{ variant: "caption", noWrap: true }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );

  const headerActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      {!isMd ? (
        <IconButton
          color="inherit"
          aria-label={t("coachAssistant.openSessions")}
          onClick={() => setSessionsDrawerOpen(true)}
          sx={{ color: "text.secondary" }}
        >
          <History size={20} />
        </IconButton>
      ) : null}
      <Button
        size="small"
        color="inherit"
        startIcon={<Trash2 size={16} />}
        onClick={clearCurrentChat}
        disabled={!hydrated || (messages.length === 0 && !contextNote.trim())}
        sx={{ textTransform: "none", color: "text.secondary" }}
      >
        {t("coachAssistant.clearChat")}
      </Button>
    </Stack>
  );

  return (
    <Stack
      spacing={0}
      sx={{
        width: "100%",
        maxWidth: "none",
        alignSelf: "stretch",
        minHeight: { xs: "70vh", md: "calc(100dvh - 140px)" },
      }}
    >
      <PageHeader
        title={t("coachAssistant.pageTitle")}
        subtitle={t("coachAssistant.pageSubtitle")}
        actions={headerActions}
        subtitleMaxWidth="none"
      />

      {!isMd ? (
        <Drawer anchor="left" open={sessionsDrawerOpen} onClose={() => setSessionsDrawerOpen(false)}>
          <Box sx={{ width: 300, p: 2, height: "100%" }}>{sessionList}</Box>
        </Drawer>
      ) : null}

      <Stack
        direction="row"
        spacing={0}
        sx={{
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
          mt: { xs: 0, md: -0.5 },
        }}
      >
        {isMd ? (
          <Box
            sx={{
              width: 280,
              flexShrink: 0,
              pr: 2,
              mr: 2,
              borderRight: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              minHeight: { md: "min(70vh, calc(100dvh - 220px))" },
            }}
          >
            {sessionList}
          </Box>
        ) : null}

        <Stack spacing={0} sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              onClick={() => setContextOpen((o) => !o)}
              endIcon={
                <ChevronDown
                  size={18}
                  style={{
                    transform: contextOpen ? "rotate(180deg)" : undefined,
                    transition: "transform 0.2s ease",
                  }}
                />
              }
              sx={{ textTransform: "none", color: "text.secondary", px: 0, minWidth: 0 }}
            >
              {t("coachAssistant.contextToggle")}
            </Button>
            <Collapse in={contextOpen}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={8}
                size="small"
                margin="dense"
                label={t("coachAssistant.contextLabel")}
                placeholder={t("coachAssistant.contextPlaceholder")}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                disabled={loading}
                helperText={t("coachAssistant.contextHelper")}
                sx={{ mt: 1 }}
              />
            </Collapse>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              py: 1,
              px: { xs: 0, sm: 0.5 },
              minHeight: { xs: 220, sm: 280 },
            }}
          >
            {!hydrated || !workspace ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : messages.length === 0 && !loading ? (
              <Stack
                alignItems="center"
                spacing={2}
                sx={{
                  py: { xs: 4, md: 6 },
                  px: 2,
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.1),
                    color: "primary.main",
                  }}
                >
                  <Sparkles size={22} strokeWidth={1.75} />
                </Box>
                <Typography variant="body2" sx={{ maxWidth: 480, lineHeight: 1.65 }}>
                  {t("coachAssistant.emptyState")}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={0} sx={{ pb: 2 }}>
                {messages.map((m) => (
                  <Box
                    key={m.id}
                    sx={{
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-of-type": { borderBottom: "none" },
                    }}
                  >
                    {m.role === "user" ? (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: "text.disabled",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          mb: 0.75,
                        }}
                      >
                        {t("coachAssistant.msgYou")}
                      </Typography>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: "text.disabled",
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          mb: 0.75,
                        }}
                      >
                        {t("coachAssistant.msgAssistant")}
                      </Typography>
                    )}
                    <Typography
                      variant="body1"
                      component="div"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "text.primary",
                        lineHeight: 1.65,
                        fontWeight: m.role === "user" ? 500 : 400,
                        paddingInlineStart: m.role === "assistant" ? 1.5 : 0,
                        borderInlineStart: m.role === "assistant" ? "3px solid" : "none",
                        borderInlineStartColor: "primary.main",
                      }}
                    >
                      {m.content}
                    </Typography>
                  </Box>
                ))}
                {loading ? (
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 2 }}>
                    <CircularProgress size={18} thickness={5} />
                    <Typography variant="body2" color="text.secondary">
                      {t("coachAssistant.thinking")}
                    </Typography>
                  </Stack>
                ) : null}
                <div ref={bottomRef} />
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: "divider" }} />

          <Stack
            direction="row"
            alignItems="flex-end"
            spacing={1}
            sx={{
              pt: 2,
              pb: { xs: 1, sm: 0 },
            }}
          >
            <InputBase
              multiline
              maxRows={6}
              fullWidth
              placeholder={t("coachAssistant.inputPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              sx={{
                px: 0,
                py: 0.5,
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "text.primary",
                "& textarea": { overflow: "auto !important" },
              }}
            />
            <IconButton
              color="primary"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label={t("coachAssistant.send")}
              sx={{
                flexShrink: 0,
                bgcolor: input.trim() && !loading ? "primary.main" : "action.hover",
                color: input.trim() && !loading ? "primary.contrastText" : "action.disabled",
                "&:hover": {
                  bgcolor: input.trim() && !loading ? "primary.dark" : "action.selected",
                },
                "&.Mui-disabled": {
                  bgcolor: "action.hover",
                  color: "action.disabled",
                },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <ArrowUp size={20} strokeWidth={2.5} />}
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
