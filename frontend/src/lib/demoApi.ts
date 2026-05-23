import { apiPrefix, authHeaders } from "./api";

export type DemoSeedSummary = {
  coach_id: number;
  invite_code: string | null;
  clients: number;
  training_plans: number;
  nutrition_templates: number;
  plan_templates: number;
  invoices: number;
  messages: number;
  workout_sessions: number;
};

export async function apiDemoSeed(): Promise<DemoSeedSummary> {
  const res = await fetch(`${apiPrefix}/demo/seed`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { summary: DemoSeedSummary };
  return data.summary;
}

export async function apiDemoReset(): Promise<void> {
  const res = await fetch(`${apiPrefix}/demo/reset`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}
