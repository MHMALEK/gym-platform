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
import { ArrowUp, ChevronDown, ExternalLink, HelpCircle, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router-dom";

import { useCoachAi } from "../../contexts/CoachAiContext";
import { sendCoachChat, type CoachChatTurn } from "../../lib/coachAiChat";
import { areaSupportsPlanBuild, resolveAiArea } from "../../lib/contextualAiConfig";
import { TrainingPlanDraftPanel } from "./TrainingPlanDraftPanel";

type PanelMessage = { id: string; role: "user" | "assistant"; content: string };

function turnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ContextualCoachAiPanel() {
  const theme = useTheme();
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

  const [guideOpen, setGuideOpen] = useState(true);
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

      const apiPayload: CoachChatTurn[] = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendCoachChat({
        messages: apiPayload,
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
      void send(prompt);
    },
    [send, t],
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

  return (
    <>
      <Drawer
        anchor="right"
        open={panelOpen}
        onClose={closePanel}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Sparkles size={18} strokeWidth={2.25} />
            <Typography variant="subtitle1" fontWeight={600}>
              {t("contextualAi.panelTitle")}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={closePanel} aria-label={t("actions.cancel")}>
            <X size={18} />
          </IconButton>
        </Stack>

        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<HelpCircle size={16} />}
            endIcon={
              <ChevronDown
                size={16}
                style={{ transform: guideOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
              />
            }
            onClick={() => setGuideOpen((o) => !o)}
            sx={{ textTransform: "none", color: "text.secondary", mb: 0.5, px: 0.5 }}
          >
            {t("contextualAi.guideToggle")}
          </Button>
          <Collapse in={guideOpen}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
              {t(area.guideKey)}
            </Typography>
          </Collapse>

          {showPlanBuild ? (
            <Tabs
              value={panelTab}
              onChange={(_, v) => setPanelTab(v as "ask" | "build")}
              sx={{ minHeight: 36, mb: 1, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontSize: 13 } }}
            >
              <Tab label={t("contextualAi.tabAsk")} value="ask" />
              <Tab label={t("contextualAi.tabBuildPlan")} value="build" />
            </Tabs>
          ) : null}
        </Box>

        {panelTab === "build" && showPlanBuild && planBuilder ? (
          <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 2 }}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mb: 2 }}>
              {(area.planBuildPromptKeys ?? []).map((key) => (
                <Chip
                  key={key}
                  label={t(key)}
                  size="small"
                  variant="outlined"
                  onClick={() => buildPrompt(key)}
                  sx={{ maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 } }}
                />
              ))}
            </Stack>
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
            <Stack direction="row" spacing={0.75} sx={{ px: 2, pb: 1, flexWrap: "wrap", gap: 0.75, flexShrink: 0 }}>
              {area.promptKeys.map((key) => (
                <Chip
                  key={key}
                  label={t(key)}
                  size="small"
                  variant="outlined"
                  disabled={loading}
                  onClick={() => askPrompt(key)}
                  sx={{ maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 } }}
                />
              ))}
            </Stack>

            <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1, minHeight: 0 }}>
              {messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                  {t("contextualAi.emptyAsk")}
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {messages.map((m) => (
                    <Box
                      key={m.id}
                      sx={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "92%",
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        bgcolor:
                          m.role === "user"
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.text.primary, 0.06),
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                        {m.role === "user" ? t("coachAssistant.msgYou") : t("coachAssistant.msgAssistant")}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {m.content}
                      </Typography>
                    </Box>
                  ))}
                  {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption">{t("coachAssistant.thinking")}</Typography>
                    </Stack>
                  ) : null}
                  <div ref={bottomRef} />
                </Stack>
              )}
              {error ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              ) : null}
            </Box>

            <Divider />
            <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.5, flexShrink: 0 }}>
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
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              />
              <IconButton
                color="primary"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
                aria-label={t("coachAssistant.send")}
                sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }}
              >
                <ArrowUp size={18} />
              </IconButton>
            </Stack>
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
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            {t("contextualAi.openFullAssistant")}
          </Button>
        </Box>
      </Drawer>

      {!panelOpen ? (
        <Fab
          color="primary"
          aria-label={t("contextualAi.openFab")}
          onClick={() => openPanel({ tab: showPlanBuild ? "build" : "ask" })}
          sx={{
            position: "fixed",
            bottom: { xs: 20, sm: 28 },
            right: { xs: 20, sm: 28 },
            zIndex: theme.zIndex.speedDial,
            boxShadow: theme.shadows[6],
          }}
        >
          <Sparkles size={22} strokeWidth={2.25} />
        </Fab>
      ) : null}
    </>
  );
}
