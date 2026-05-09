import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Sparkles, X } from "lucide-react";
import type { RefObject } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../lib/api";
import type { WorkoutLine } from "../lib/workoutLineModel";
import { workoutLinesFromApiItems } from "../lib/workoutLineModel";
import type { WorkoutItemsEditorHandle } from "./workout-builder/types";

type DraftApiLine = {
  exercise_id: number;
  sort_order: number;
  sets?: number | null;
  reps?: number | null;
  duration_sec?: number | null;
  rest_sec?: number | null;
  notes?: string | null;
  row_type?: string | null;
  exercise?: { id?: number; name?: string };
};

type DraftApiUnresolved = {
  requested_name: string;
  candidates: Array<{ id: number; name: string }>;
};

type DraftApiResponse = {
  plan_name: string;
  plan_description?: string | null;
  assistant_summary?: string | null;
  lines: DraftApiLine[];
  unresolved: DraftApiUnresolved[];
};

export type TrainingPlanAiAssistantProps = {
  venueType: string;
  /** Edit page: push draft into the mounted editor (auto-save). */
  workoutEditorRef?: RefObject<WorkoutItemsEditorHandle | null>;
  /** Create page: parent holds workout lines in React state. */
  onApplyWorkoutLines?: (lines: WorkoutLine[]) => void;
  /** Optional: fill plan name / description from the draft (create flow). */
  onApplyPlanMeta?: (meta: { planName: string; planDescription: string | null }) => void;
};

export function TrainingPlanAiAssistant({
  venueType,
  workoutEditorRef,
  onApplyWorkoutLines,
  onApplyPlanMeta,
}: TrainingPlanAiAssistantProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftApiResponse | null>(null);

  const runDraft = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch(`${apiPrefix}/ai/training-plan-draft`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          venue_type: venueType,
          locale: i18n.language,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          const j = JSON.parse(raw) as { detail?: unknown };
          if (typeof j.detail === "string") detail = j.detail;
          else if (Array.isArray(j.detail)) detail = j.detail.map((d) => String(d)).join(", ");
        } catch {
          /* use raw */
        }
        setError(detail || t("trainingPlans.ai.genericError"));
        return;
      }
      const data = JSON.parse(raw) as DraftApiResponse;
      setDraft(data);
    } catch {
      setError(t("trainingPlans.ai.networkError"));
    } finally {
      setLoading(false);
    }
  }, [input, t, venueType, i18n.language]);

  const applyDraft = useCallback(() => {
    if (!draft?.lines?.length) return;
    const lines = workoutLinesFromApiItems(draft.lines);
    if (workoutEditorRef?.current) {
      workoutEditorRef.current.replaceItems(lines);
    } else if (onApplyWorkoutLines) {
      onApplyWorkoutLines(lines);
    }
    if (onApplyPlanMeta && draft.plan_name?.trim()) {
      onApplyPlanMeta({
        planName: draft.plan_name.trim(),
        planDescription: draft.plan_description?.trim() ? draft.plan_description.trim() : null,
      });
    }
    setOpen(false);
  }, [draft, onApplyPlanMeta, onApplyWorkoutLines, workoutEditorRef]);

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        size="small"
        startIcon={<Sparkles size={16} strokeWidth={2.25} />}
        onClick={() => setOpen(true)}
        sx={{
          textTransform: "none",
          fontWeight: 500,
          borderColor: "divider",
          color: "text.secondary",
          "&:hover": { borderColor: "primary.main", color: "primary.main" },
        }}
      >
        {t("trainingPlans.ai.openButton")}
      </Button>

      <Drawer anchor="right" open={open} onClose={() => !loading && setOpen(false)}>
        <Box
          sx={{
            width: { xs: "100vw", sm: 400 },
            maxWidth: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {t("trainingPlans.ai.drawerTitle")}
            </Typography>
            <IconButton size="small" onClick={() => !loading && setOpen(false)} aria-label="Close">
              <X size={18} />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("trainingPlans.ai.drawerHint")}
            </Typography>
            <TextField
              label={t("trainingPlans.ai.promptLabel")}
              multiline
              minRows={5}
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={t("trainingPlans.ai.promptPlaceholder")}
            />
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
            {draft?.assistant_summary ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                {draft.assistant_summary}
              </Alert>
            ) : null}
            {draft?.plan_name ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("trainingPlans.ai.suggestedName")}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {draft.plan_name}
                </Typography>
              </Box>
            ) : null}
            {draft?.unresolved?.length ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {t("trainingPlans.ai.unresolvedTitle")}
                </Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                  {draft.unresolved.map((u) => (
                    <Typography key={u.requested_name} component="li" variant="body2">
                      {u.requested_name}
                      {u.candidates?.length
                        ? ` — ${t("trainingPlans.ai.tryPick")}: ${u.candidates
                            .slice(0, 3)
                            .map((c) => c.name)
                            .join(", ")}`
                        : ""}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            ) : null}
            {draft?.lines?.length ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t("trainingPlans.ai.linesCount", { count: draft.lines.length })}
              </Typography>
            ) : null}
          </Box>

          <Divider />
          <Stack direction="row" spacing={1} sx={{ p: 2, justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)} disabled={loading} color="inherit">
              {t("actions.cancel")}
            </Button>
            <Button variant="outlined" onClick={() => void runDraft()} disabled={loading || !input.trim()}>
              {loading ? <CircularProgress size={18} /> : t("trainingPlans.ai.generate")}
            </Button>
            <Button
              variant="contained"
              onClick={applyDraft}
              disabled={!draft?.lines?.length || loading}
              sx={{ textTransform: "none" }}
            >
              {t("trainingPlans.ai.apply")}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
