import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CoachingPlanPreview } from "../../../components/CoachingPlanPreview";
import { useClientMe } from "../../../contexts/ClientMeContext";
import { dietMealsFromApi } from "../../../lib/nutritionTotals";
import { workoutLinesFromApiItems } from "../../../lib/workoutLineModel";

export function ClientNutritionPlanPage() {
  const { t } = useTranslation();
  const { me } = useClientMe();

  const meals = useMemo(
    () => dietMealsFromApi((me?.coaching_plan.diet_meals ?? []) as Parameters<typeof dietMealsFromApi>[0]),
    [me?.coaching_plan.diet_meals],
  );

  if (!me) return null;

  const plan = me.coaching_plan;
  const hasDiet = Boolean(plan.diet_plan?.trim()) || meals.length > 0;

  if (!hasDiet) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {t("clientPortal.diet")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.noNutritionYet")}
        </Typography>
      </Box>
    );
  }

  return (
    <CoachingPlanPreview
      clientName={me.name}
      title={t("clientPortal.nutritionPlanTitle")}
      eyebrow={me.coach_name}
      workoutRichHtml={null}
      workoutNotes={null}
      workoutLines={workoutLinesFromApiItems([])}
      dietMeals={meals}
      dietNotes={plan.diet_plan}
      showDiet
    />
  );
}
