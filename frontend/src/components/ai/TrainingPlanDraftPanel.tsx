import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../../lib/api";
import type { WorkoutLine } from "../../lib/workoutLineModel";
import { workoutLinesFromApiItems } from "../../lib/workoutLineModel";
import type { WorkoutItemsEditorHandle } from "../workout-builder/types";

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

export type TrainingPlanDraftPanelProps = {
  venueType: string;
  workoutEditorRef?: RefObject<WorkoutItemsEditorHandle | null>;
  onApplyWorkoutLines?: (lines: WorkoutLine[]) => void;
  onApplyPlanMeta?: (meta: { planName: string; planDescription: string | null }) => void;
  /** Prefill prompt when opened from contextual panel chips. */
  initialPrompt?: string;
  onApplied?: () => void;
  compact?: boolean;
};

export function TrainingPlanDraftPanel({
  venueType,
  workoutEditorRef,
  onApplyWorkoutLines,
  onApplyPlanMeta,
  initialPrompt = "",
  onApplied,
  compact = false,
}: TrainingPlanDraftPanelProps) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftApiResponse | null>(null);

  useEffect(() => {
    if (initialPrompt.trim()) setInput(initialPrompt);
  }, [initialPrompt]);

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
    onApplied?.();
  }, [draft, onApplyPlanMeta, onApplyWorkoutLines, workoutEditorRef, onApplied]);

  return (
    <Box>
      {!compact ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("trainingPlans.ai.drawerHint")}
        </Typography>
      ) : null}
      <TextField
        label={t("trainingPlans.ai.promptLabel")}
        multiline
        minRows={compact ? 4 : 5}
        fullWidth
        size="small"
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
      <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" onClick={() => void runDraft()} disabled={loading || !input.trim()}>
          {loading ? <CircularProgress size={18} /> : t("trainingPlans.ai.generate")}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={applyDraft}
          disabled={!draft?.lines?.length || loading}
          sx={{ textTransform: "none" }}
        >
          {t("trainingPlans.ai.apply")}
        </Button>
      </Stack>
    </Box>
  );
}
