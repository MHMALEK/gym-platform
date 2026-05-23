import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Sparkles, X } from "lucide-react";
import type { RefObject } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WorkoutLine } from "../lib/workoutLineModel";
import type { WorkoutItemsEditorHandle } from "./workout-builder/types";
import { TrainingPlanDraftPanel } from "./ai/TrainingPlanDraftPanel";

export type TrainingPlanAiAssistantProps = {
  venueType: string;
  workoutEditorRef?: RefObject<WorkoutItemsEditorHandle | null>;
  onApplyWorkoutLines?: (lines: WorkoutLine[]) => void;
  onApplyPlanMeta?: (meta: { planName: string; planDescription: string | null }) => void;
};

export function TrainingPlanAiAssistant({
  venueType,
  workoutEditorRef,
  onApplyWorkoutLines,
  onApplyPlanMeta,
}: TrainingPlanAiAssistantProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Stack sx={{ width: { xs: "100vw", sm: 400 }, maxWidth: "100%", height: "100%" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {t("trainingPlans.ai.drawerTitle")}
            </Typography>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </IconButton>
          </Stack>
          <Stack sx={{ flex: 1, overflow: "auto", p: 2 }}>
            <TrainingPlanDraftPanel
              venueType={venueType}
              workoutEditorRef={workoutEditorRef}
              onApplyWorkoutLines={onApplyWorkoutLines}
              onApplyPlanMeta={onApplyPlanMeta}
              onApplied={() => setOpen(false)}
            />
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
