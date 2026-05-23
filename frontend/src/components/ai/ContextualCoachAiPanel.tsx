import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router-dom";

import { useCoachAi } from "../../contexts/CoachAiContext";
import { sendCoachChat, type CoachChatTurn } from "../../lib/coachAiChat";
import { areaSupportsPlanBuild, resolveAiArea } from "../../lib/contextualAiConfig";
import {
  AI_ACCENT,
  aiComposerSx,
  aiFabSx,
  aiHeaderGradient,
  aiSendButtonSx,
  aiSoftBg,
  aiSoftBorder,
  promptChipSx,
} from "./aiPanelTheme";
import { TrainingPlanDraftPanel } from "./TrainingPlanDraftPanel";

type PanelMessage = { id: string; role: "user" | "assistant"; content: string };

function turnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function MessageBlock({
  role,
  content,
  youLabel,
  assistantLabel,
}: {
  role: "user" | "assistant";
  content: string;
  youLabel: string;
  assistantLabel: string;
}) {
  const isAssistant = role === "assistant";
  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        {isAssistant ? (
          <Bot size={14} strokeWidth={2.25} color={AI_ACCENT.main} />
        ) : null}
        <Typography
          variant="caption"
          sx={{
            color: isAssistant ? AI_ACCENT.light : "text.disabled",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: 10.5,
          }}
        >
          {isAssistant ? assistantLabel : youLabel}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        component="div"
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "text.primary",
          lineHeight: 1.6,
          fontWeight: isAssistant ? 400 : 500,
          paddingInlineStart: isAssistant ? 1.5 : 0,
          borderInlineStart: isAssistant ? "3px solid" : "none",
          borderInlineStartColor: AI_ACCENT.main,
        }}
      >
        {content}
      </Typography>
    </Box>
  );
}

export function ContextualCoachAiPanel() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const drawerAnchor = theme.direction === "rtl" ? "left" : "right";
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const {
    pageContext,
    planBuilder,
    panelOpen,
    openPanel,
    closePanel,
    panelTab,
    setPanelTab,
    buildPrefill,
    setBuildPrefill,
  } = useCoachAi();

  const area = useMemo(() => resolveAiArea(location.pathname), [location.pathname]);
  const showPlanBuild = areaSupportsPlanBuild(area) && planBuilder != null;
  const hideFab = location.pathname === "/assistant";

  const [guideOpen, setGuideOpen] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevAreaRef = useRef(area.id);

  useEffect(() => {
    if (prevAreaRef.current !== area.id) {
      prevAreaRef.current = area.id;
      setMessages([]);
      setError(null);
    }
  }, [area.id]);

  useEffect(() => {
    if (panelOpen && !showPlanBuild && panelTab === "build") setPanelTab("ask");
  }, [panelOpen, showPlanBuild, panelTab, setPanelTab]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const combinedContext = useMemo(() => {
    const parts = [
      `Current page: ${location.pathname}`,
      `Area: ${area.id}`,
      pageContext.trim() ? pageContext.trim() : null,
    ].filter(Boolean);
    return parts.join("\n");
  }, [location.pathname, area.id, pageContext]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setInput("");
  }, []);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;
      setInput("");
      setError(null);
      const userTurn: PanelMessage = { id: turnId(), role: "user", content: text };
      const nextHistory = [...messages, userTurn];
      setMessages(nextHistory);
      setLoading(true);
      setTimeout(scrollToBottom, 50);

      const result = await sendCoachChat({
        messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        context: combinedContext,
        locale: i18n.language,
      });

      if ("error" in result) {
        const msg =
          result.error === "network"
            ? t("coachAssistant.networkError")
            : result.error === "error"
              ? t("coachAssistant.errorGeneric")
              : result.error;
        setError(msg);
        setMessages(messages);
        setInput(text);
        setLoading(false);
        return;
      }

      const reply = result.message || t("coachAssistant.emptyReply");
      setMessages([...nextHistory, { id: turnId(), role: "assistant", content: reply }]);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    },
    [input, loading, messages, combinedContext, i18n.language, scrollToBottom, t],
  );

  const askPrompt = useCallback(
    (key: string) => {
      const prompt = t(key);
      if (prompt === key) return;
      if (panelTab !== "ask") setPanelTab("ask");
      void send(prompt);
    },
    [send, t, panelTab, setPanelTab],
  );

  const buildPrompt = useCallback(
    (key: string) => {
      const prompt = t(key);
      if (prompt === key) return;
      setBuildPrefill(prompt);
      setPanelTab("build");
      if (!panelOpen) openPanel({ tab: "build", prefill: prompt });
    },
    [t, setBuildPrefill, setPanelTab, panelOpen, openPanel],
  );

  if (hideFab) return null;

  const promptChipProps = { size: "small" as const, sx: promptChipSx(theme) };
  const canSend = Boolean(input.trim()) && !loading;

  return (
    <>
      <Drawer
        anchor={drawerAnchor}
        open={panelOpen}
        onClose={closePanel}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 400 },
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            borderInlineStart: 1,
            borderColor: "divider",
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2,
            py: 1.5,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: "divider",
            background: aiHeaderGradient(theme),
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: aiSoftBg(theme),
                color: AI_ACCENT.main,
                border: "1px solid",
                borderColor: aiSoftBorder(theme),
              }}
            >
              <Sparkles size={17} strokeWidth={2.25} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                {t("contextualAi.panelTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                {t("contextualAi.panelSubtitle")}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {messages.length > 0 && panelTab === "ask" ? (
              <IconButton
                size="small"
                onClick={clearChat}
                aria-label={t("coachAssistant.clearChat")}
                sx={{ color: "text.secondary" }}
              >
                <Trash2 size={16} />
              </IconButton>
            ) : null}
            <IconButton size="small" onClick={closePanel} aria-label={t("actions.cancel")}>
              <X size={18} />
            </IconButton>
          </Stack>
        </Stack>

        <Box sx={{ px: 2, pt: 1.25, flexShrink: 0 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<HelpCircle size={15} />}
            endIcon={
              <ChevronDown
                size={15}
                style={{ transform: guideOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
              />
            }
            onClick={() => setGuideOpen((o) => !o)}
            sx={{ textTransform: "none", color: "text.secondary", mb: 0.5, px: 0.5, minWidth: 0 }}
          >
            {t("contextualAi.guideToggle")}
          </Button>
          <Collapse in={guideOpen}>
            <Box
              sx={{
                mb: 1.5,
                px: 1.25,
                py: 1,
                borderRadius: 2,
                bgcolor: aiSoftBg(theme),
                border: "1px solid",
                borderColor: aiSoftBorder(theme),
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: 13 }}>
                {t(area.guideKey)}
              </Typography>
            </Box>
          </Collapse>

          {showPlanBuild ? (
            <Tabs
              value={panelTab}
              onChange={(_, v) => setPanelTab(v as "ask" | "build")}
              TabIndicatorProps={{ sx: { display: "none" } }}
              sx={{
                minHeight: 38,
                mb: 1.25,
                p: 0.5,
                borderRadius: 2.5,
                bgcolor: (th) => alpha(th.palette.text.primary, th.palette.mode === "dark" ? 0.06 : 0.05),
                "& .MuiTab-root": {
                  minHeight: 32,
                  flex: 1,
                  textTransform: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 2,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: "background.paper",
                    color: AI_ACCENT.main,
                    fontWeight: 600,
                    boxShadow: theme.shadows[1],
                  },
                },
              }}
            >
              <Tab icon={<Bot size={15} />} iconPosition="start" label={t("contextualAi.tabAsk")} value="ask" />
              <Tab
                icon={<Wand2 size={15} />}
                iconPosition="start"
                label={t("contextualAi.tabBuildPlan")}
                value="build"
              />
            </Tabs>
          ) : null}

          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
            {panelTab === "build" ? t("contextualAi.suggestionsBuild") : t("contextualAi.suggestionsAsk")}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.25 }}>
            {(panelTab === "build" && showPlanBuild
              ? (area.planBuildPromptKeys ?? [])
              : area.promptKeys
            ).map((key) => (
              <Chip
                key={key}
                label={t(key)}
                {...promptChipProps}
                disabled={loading && panelTab === "ask"}
                onClick={() => (panelTab === "build" ? buildPrompt(key) : askPrompt(key))}
              />
            ))}
          </Stack>
        </Box>

        {panelTab === "build" && showPlanBuild && planBuilder ? (
          <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 2, minHeight: 0 }}>
            <TrainingPlanDraftPanel
              venueType={planBuilder.venueType}
              workoutEditorRef={planBuilder.workoutEditorRef}
              onApplyWorkoutLines={planBuilder.onApplyWorkoutLines}
              onApplyPlanMeta={planBuilder.onApplyPlanMeta}
              initialPrompt={buildPrefill}
              compact
              onApplied={closePanel}
            />
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, overflow: "auto", px: 2, minHeight: 0 }}>
              {messages.length === 0 && !loading ? (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 4, px: 1, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: aiSoftBg(theme),
                      color: AI_ACCENT.main,
                      border: "1px solid",
                      borderColor: aiSoftBorder(theme),
                    }}
                  >
                    <Sparkles size={20} strokeWidth={2} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 300 }}>
                    {t("contextualAi.emptyAsk")}
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0} sx={{ pb: 1 }}>
                  {messages.map((m) => (
                    <MessageBlock
                      key={m.id}
                      role={m.role}
                      content={m.content}
                      youLabel={t("coachAssistant.msgYou")}
                      assistantLabel={t("coachAssistant.msgAssistant")}
                    />
                  ))}
                  {loading ? (
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2 }}>
                      <CircularProgress size={16} sx={{ color: AI_ACCENT.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {t("coachAssistant.thinking")}
                      </Typography>
                    </Stack>
                  ) : null}
                  <div ref={bottomRef} />
                </Stack>
              )}
              {error ? (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
                  {error}
                </Alert>
              ) : null}
            </Box>

            <Box
              sx={{
                px: 2,
                py: 1.5,
                flexShrink: 0,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: (th) => alpha(th.palette.background.default, 0.6),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <InputBase
                  multiline
                  maxRows={4}
                  fullWidth
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={t("contextualAi.inputPlaceholder")}
                  disabled={loading}
                  sx={aiComposerSx(theme)}
                />
                <IconButton
                  disabled={!canSend}
                  onClick={() => void send()}
                  aria-label={t("coachAssistant.send")}
                  sx={aiSendButtonSx(theme, canSend)}
                >
                  <ArrowUp size={18} />
                </IconButton>
              </Stack>
            </Box>
          </>
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1.25, flexShrink: 0 }}>
          <Button
            component={RouterLink}
            to="/assistant"
            size="small"
            color="inherit"
            startIcon={<ExternalLink size={14} />}
            onClick={closePanel}
            sx={{ textTransform: "none", color: "text.secondary", fontSize: 13 }}
          >
            {t("contextualAi.openFullAssistant")}
          </Button>
        </Box>
      </Drawer>

      {!panelOpen ? (
        <Fab
          variant={isSm ? "extended" : "circular"}
          aria-label={t("contextualAi.openFab")}
          onClick={() => openPanel({ tab: showPlanBuild ? "build" : "ask" })}
          sx={{
            ...aiFabSx,
            position: "fixed",
            bottom: { xs: 20, sm: 24 },
            right: theme.direction === "rtl" ? undefined : { xs: 20, sm: 24 },
            left: theme.direction === "rtl" ? { xs: 20, sm: 24 } : undefined,
            zIndex: theme.zIndex.speedDial,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            gap: 0.75,
            px: isSm ? 2.5 : undefined,
          }}
        >
          <Sparkles size={20} strokeWidth={2.25} />
          {isSm ? t("contextualAi.openFab") : null}
        </Fab>
      ) : null}
    </>
  );
}
