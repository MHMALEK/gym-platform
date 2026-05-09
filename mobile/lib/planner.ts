import { apiGetList, apiGetOne, apiGetPath, apiPutPath, type ListResponse } from "./api";
import type { ClientRow } from "./clients";

export type TrainingPlanSummary = {
  id: number;
  coach_id: number | null;
  name: string;
  description?: string | null;
  workout_rich_html?: string | null;
  source_catalog_plan_id?: number | null;
  venue_type: "home" | "commercial_gym" | "mixed" | string;
};

export type TrainingPlanItem = {
  id: number;
  training_plan_id: number;
  exercise_id: number;
  sort_order: number;
  sets?: number | null;
  reps?: number | null;
  duration_sec?: number | null;
  rest_sec?: number | null;
  notes?: string | null;
  block_id?: string | null;
  block_type?: string | null;
  block_sequence?: number | null;
  row_type?: "legacy_line" | "exercise" | "set" | string;
  exercise_instance_id?: string | null;
  exercise?: {
    id: number;
    name: string;
    category?: string | null;
    equipment?: string | null;
  } | null;
};

export type TrainingPlanRead = TrainingPlanSummary & {
  items: TrainingPlanItem[];
};

export type ClientCoachingPlan = {
  workout_plan?: string | null;
  workout_rich_html?: string | null;
  program_venue?: "mixed" | "home" | "commercial_gym" | string;
  diet_plan?: string | null;
  diet_meals?: unknown[];
  workout_items?: unknown[];
  updated_at?: string | null;
  assigned_training_plan_id?: number | null;
  assigned_nutrition_template_id?: number | null;
};

export async function listTrainingPlans(page: {
  limit: number;
  offset: number;
}): Promise<ListResponse<TrainingPlanSummary>> {
  return apiGetList<TrainingPlanSummary>("training-plans", { limit: page.limit, offset: page.offset });
}

export async function getTrainingPlan(id: number): Promise<TrainingPlanRead> {
  return apiGetOne<TrainingPlanRead>("training-plans", id);
}

export async function listPlannerClients(page: {
  limit: number;
  offset: number;
}): Promise<ListResponse<ClientRow>> {
  return apiGetList<ClientRow>("clients", { limit: page.limit, offset: page.offset });
}

export async function getClientCoachingPlan(clientId: number): Promise<ClientCoachingPlan> {
  return apiGetPath<ClientCoachingPlan>(`clients/${clientId}/coaching-plans`);
}

export async function assignTrainingPlanToClient(
  clientId: number,
  assignedTrainingPlanId: number | null,
): Promise<ClientCoachingPlan> {
  return apiPutPath<ClientCoachingPlan>(`clients/${clientId}/coaching-plans`, {
    assigned_training_plan_id: assignedTrainingPlanId,
  });
}
