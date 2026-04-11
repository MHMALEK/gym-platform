import {
  assignNutritionTemplateToClients,
  assignTrainingPlanToClients,
} from "../../lib/coachingPlanApply";

type AssignOptions = {
  trainingPlanId: number | null;
  nutritionTemplateId: number | null;
};

/**
 * After creating a client, copies the chosen training plan and/or nutrition template
 * via the same partial PUTs as “assign to clients” elsewhere (two sequential calls when both
 * are selected — avoids a single merged body failing validation).
 */
export async function assignInitialCoachingPlans(
  clientId: number,
  options: AssignOptions,
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { trainingPlanId, nutritionTemplateId } = options;
  if (trainingPlanId == null && nutritionTemplateId == null) {
    return { ok: true };
  }

  if (trainingPlanId != null) {
    const r = await assignTrainingPlanToClients(trainingPlanId, [clientId], apiBase, getHeaders);
    if (!r.ok) return r;
  }
  if (nutritionTemplateId != null) {
    const r = await assignNutritionTemplateToClients(nutritionTemplateId, [clientId], apiBase, getHeaders);
    if (!r.ok) return r;
  }
  return { ok: true };
}
