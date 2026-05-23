import { apiPrefix, authBearerHeaders, authHeaders, httpErrorFromResponse } from "./api";
import type { ClientMe } from "./authApi";

export type ClientPortalInvoice = {
  id: number;
  reference: string | null;
  amount: number | string | null;
  currency: string;
  due_date: string | null;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInvoiceListResponse = {
  items: ClientPortalInvoice[];
  total: number;
  limit: number;
  offset: number;
};

export async function apiClientInvoices(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ClientInvoiceListResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  const res = await fetch(`${apiPrefix}/client/invoices${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export async function apiClientInvoice(id: number): Promise<ClientPortalInvoice> {
  const res = await fetch(`${apiPrefix}/client/invoices/${id}`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export async function downloadClientInvoicePdf(id: number): Promise<Blob> {
  const res = await fetch(`${apiPrefix}/client/invoices/${id}/pdf`, {
    headers: authBearerHeaders(),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.blob();
}

export type ClientChatMessage = {
  id: number;
  sender_type: "coach" | "client";
  body: string;
  created_at: string;
};

export async function apiClientMessages(): Promise<ClientChatMessage[]> {
  const res = await fetch(`${apiPrefix}/client/messages`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  const data = (await res.json()) as { items: ClientChatMessage[] };
  return data.items ?? [];
}

export async function apiClientSendMessage(body: string): Promise<ClientChatMessage> {
  const res = await fetch(`${apiPrefix}/client/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  const data = (await res.json()) as { message: ClientChatMessage };
  return data.message;
}

export type ClientReminder = {
  id: string;
  kind: string;
  title: string;
  body: string;
  severity: "high" | "medium" | "low";
  action: "invoices" | "plans" | "messages" | "promotions" | null;
  related_id: number | null;
  due_at: string | null;
};

export type ClientPromotion = {
  id: number;
  title: string;
  body: string | null;
  price: number | string | null;
  discount_price: number | string | null;
  currency: string;
  savings_pct: number | null;
  code: string | null;
  duration_days: number | null;
  is_current_plan: boolean;
};

export async function apiClientReminders(): Promise<ClientReminder[]> {
  const res = await fetch(`${apiPrefix}/client/reminders`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  const data = (await res.json()) as { items: ClientReminder[] };
  return data.items ?? [];
}

export async function apiClientPromotions(): Promise<ClientPromotion[]> {
  const res = await fetch(`${apiPrefix}/client/promotions`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  const data = (await res.json()) as { items: ClientPromotion[] };
  return data.items ?? [];
}

export type WorkoutSetLog = {
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  completed: boolean;
};

export type WorkoutEntryLog = {
  exercise_id: number | null;
  exercise_name: string;
  sort_order: number;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  sets: WorkoutSetLog[];
  completed: boolean;
  notes: string | null;
};

export type ClientWorkoutSession = {
  id: number;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  entries: WorkoutEntryLog[];
  exercise_count: number;
  completed_exercise_count: number;
  created_at: string;
};

export function buildEntriesFromPlanItems(
  items: { exercise_id: number; exercise_name?: string | null; sets?: number | null; reps?: number | null; notes?: string | null }[],
): WorkoutEntryLog[] {
  return items.map((item, idx) => {
    const prescribed_sets = item.sets ?? null;
    const prescribed_reps = item.reps ?? null;
    const n = prescribed_sets && prescribed_sets > 0 ? prescribed_sets : 1;
    const sets: WorkoutSetLog[] = [];
    for (let s = 1; s <= n; s += 1) {
      sets.push({ set_number: s, reps: prescribed_reps, weight_kg: null, completed: false });
    }
    return {
      exercise_id: item.exercise_id,
      exercise_name: item.exercise_name ?? `Exercise #${item.exercise_id}`,
      sort_order: idx,
      prescribed_sets,
      prescribed_reps,
      sets,
      completed: false,
      notes: item.notes ?? null,
    };
  });
}

export async function apiClientTrainingSessions(): Promise<ClientWorkoutSession[]> {
  const res = await fetch(`${apiPrefix}/client/training/sessions?limit=50`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  const data = (await res.json()) as { items: ClientWorkoutSession[] };
  return data.items ?? [];
}

export async function apiClientCreateTrainingSession(body: {
  entries: WorkoutEntryLog[];
  notes?: string | null;
}): Promise<ClientWorkoutSession> {
  const res = await fetch(`${apiPrefix}/client/training/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...body, complete: true }),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export async function apiClientTrainingSession(id: number): Promise<ClientWorkoutSession> {
  const res = await fetch(`${apiPrefix}/client/training/sessions/${id}`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export type { ClientMe };
