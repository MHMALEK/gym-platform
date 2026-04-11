import { dietMealsFromApi, normalizeDietMealsForApi } from "./nutritionTotals";
import { normalizeWorkoutItemsForApi, workoutLinesFromApiItems } from "../components/WorkoutItemsEditor";

function normalizeWorkoutRichHtml(raw: string | null | undefined): string | null {
  const htmlRaw = (raw ?? "").trim();
  if (!htmlRaw || htmlRaw === "<p><br></p>" || htmlRaw === "<p></p>") return null;
  return htmlRaw;
}

export type TrainingPlanCoachingPartial = {
  program_venue: "mixed" | "home" | "commercial_gym";
  workout_rich_html: string | null;
  workout_items: ReturnType<typeof normalizeWorkoutItemsForApi>;
};

export type NutritionTemplateCoachingPartial = {
  diet_meals: ReturnType<typeof normalizeDietMealsForApi>;
};

export async function fetchTrainingPlanCoachingPartial(
  apiBase: string,
  getHeaders: () => HeadersInit,
  trainingPlanId: number,
): Promise<{ ok: true; partial: TrainingPlanCoachingPartial } | { ok: false; message: string }> {
  const res = await fetch(`${apiBase}/training-plans/${trainingPlanId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    return { ok: false, message: await res.text() };
  }
  const data = (await res.json()) as {
    items?: Parameters<typeof workoutLinesFromApiItems>[0];
    workout_rich_html?: string | null;
    venue_type?: string | null;
  };
  const lines = workoutLinesFromApiItems(data.items ?? []);
  const workout_items = normalizeWorkoutItemsForApi(lines);
  const workout_rich_html = normalizeWorkoutRichHtml(data.workout_rich_html ?? null);
  const pv = data.venue_type;
  const program_venue =
    pv === "home" || pv === "commercial_gym" || pv === "mixed" ? pv : "mixed";
  return { ok: true, partial: { program_venue, workout_rich_html, workout_items } };
}

export async function fetchNutritionTemplateCoachingPartial(
  apiBase: string,
  getHeaders: () => HeadersInit,
  templateId: number,
): Promise<{ ok: true; partial: NutritionTemplateCoachingPartial } | { ok: false; message: string }> {
  const res = await fetch(`${apiBase}/nutrition-templates/${templateId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    return { ok: false, message: await res.text() };
  }
  const json = (await res.json()) as { meals?: unknown[] };
  const diet_meals = normalizeDietMealsForApi(dietMealsFromApi(json.meals ?? []));
  return { ok: true, partial: { diet_meals } };
}

export async function putClientCoachingPlans(
  clientId: number,
  body: Record<string, unknown>,
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const put = await fetch(`${apiBase}/clients/${clientId}/coaching-plans`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!put.ok) {
    return { ok: false, message: await put.text() };
  }
  return { ok: true };
}

/** Clears workout template link and structured workout content for this client. */
export async function clearClientWorkoutAssignment(
  clientId: number,
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return putClientCoachingPlans(
    clientId,
    {
      assigned_training_plan_id: null,
      workout_items: [],
      workout_rich_html: null,
      program_venue: "mixed",
    },
    apiBase,
    getHeaders,
  );
}

/** Clears nutrition template link and structured meals for this client. */
export async function clearClientNutritionAssignment(
  clientId: number,
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return putClientCoachingPlans(
    clientId,
    {
      assigned_nutrition_template_id: null,
      diet_meals: [],
    },
    apiBase,
    getHeaders,
  );
}

/** Applies a saved workout to clients (structured workout + overview + venue). Does not clear diet notes or meals. */
export async function assignTrainingPlanToClients(
  trainingPlanId: number,
  clientIds: number[],
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (clientIds.length === 0) return { ok: true };
  const loaded = await fetchTrainingPlanCoachingPartial(apiBase, getHeaders, trainingPlanId);
  if (!loaded.ok) return loaded;
  const { program_venue, workout_rich_html, workout_items } = loaded.partial;
  const body: Record<string, unknown> = {
    program_venue,
    workout_rich_html,
    workout_items,
    assigned_training_plan_id: trainingPlanId,
  };
  for (const clientId of clientIds) {
    const r = await putClientCoachingPlans(clientId, body, apiBase, getHeaders);
    if (!r.ok) return r;
  }
  return { ok: true };
}

/** Applies template meals to clients. Does not change workout content. */
export async function assignNutritionTemplateToClients(
  templateId: number,
  clientIds: number[],
  apiBase: string,
  getHeaders: () => HeadersInit,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (clientIds.length === 0) return { ok: true };
  const loaded = await fetchNutritionTemplateCoachingPartial(apiBase, getHeaders, templateId);
  if (!loaded.ok) return loaded;
  const body: Record<string, unknown> = {
    diet_meals: loaded.partial.diet_meals,
    assigned_nutrition_template_id: templateId,
  };
  for (const clientId of clientIds) {
    const r = await putClientCoachingPlans(clientId, body, apiBase, getHeaders);
    if (!r.ok) return r;
  }
  return { ok: true };
}
