import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CoachingPlanPreview } from "../../../components/CoachingPlanPreview";
import { useClientMe } from "../../../contexts/ClientMeContext";
import { dietMealsFromApi } from "../../../lib/nutritionTotals";
import { workoutLinesFromApiItems } from "../../../lib/workoutLineModel";

export function ClientWorkoutPlanPage() {
  const { t } = useTranslation();
  const { me } = useClientMe();

  const lines = useMemo(
    () =>
      workoutLinesFromApiItems(
        (me?.coaching_plan.workout_items ?? []) as Parameters<typeof workoutLinesFromApiItems>[0],
      ),
    [me?.coaching_plan.workout_items],
  );

  if (!me) return null;

  const plan = me.coaching_plan;
  const hasWorkout =
    Boolean(plan.workout_plan?.trim()) ||
    Boolean(plan.workout_rich_html?.trim()) ||
    lines.length > 0;

  if (!hasWorkout) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {t("clientPortal.workout")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.noWorkoutYet")}
        </Typography>
      </Box>
    );
  }

  return (
    <CoachingPlanPreview
      clientName={me.name}
      title={t("clientPortal.workoutPlanTitle")}
      eyebrow={me.coach_name}
      programVenue={plan.program_venue ?? "mixed"}
      workoutRichHtml={plan.workout_rich_html}
      workoutNotes={plan.workout_plan}
      workoutLines={lines}
      dietMeals={[]}
      showDiet={false}
    />
  );
}
