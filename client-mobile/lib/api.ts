import { apiBaseUrl, apiPrefix } from "./config";
import { getAccessToken } from "./token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const isNetwork =
      raw.includes("Network request failed") ||
      raw.includes("Failed to connect") ||
      raw.includes("ECONNREFUSED");
    if (isNetwork) {
      const base = apiBaseUrl() || "(missing EXPO_PUBLIC_API_URL)";
      throw new Error(
        `Cannot reach API at ${base}. Start backend with uvicorn --host 0.0.0.0 --port 8000. ` +
          `Android emulator: http://10.0.2.2:8000. Physical device: your LAN IP. ` +
          `Restart Expo after .env changes: npx expo start -c. (${raw})`,
      );
    }
    throw e;
  }
}

async function parseErr(res: Response): Promise<never> {
  const t = (await res.text()).trim();
  throw new ApiError(t || res.statusText || `HTTP ${res.status}`, res.status);
}

export async function authHeadersJson(): Promise<HeadersInit> {
  const t = await getAccessToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function authBearerHeaders(): Promise<HeadersInit> {
  const t = await getAccessToken();
  const h: Record<string, string> = {};
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export type ClientWorkoutItem = {
  exercise_id: number;
  exercise_name?: string | null;
  sets?: number | null;
  reps?: number | null;
  notes?: string | null;
};

export type DietMeal = {
  name?: string;
  notes?: string;
  items?: { name?: string; amount?: string }[];
};

export type ClientCoachingPlan = {
  workout_plan: string | null;
  workout_rich_html: string | null;
  program_venue: string;
  diet_plan: string | null;
  diet_meals: DietMeal[];
  workout_items: ClientWorkoutItem[];
  updated_at: string | null;
};

export type ClientMe = {
  id: number;
  name: string;
  email: string | null;
  coach_id: number;
  coach_name: string;
  coach_tagline: string | null;
  status: string;
  account_status: string;
  coaching_plan: ClientCoachingPlan;
};

export type ClientInvoice = {
  id: number;
  reference: string | null;
  amount: number | string | null;
  currency: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
};

export type ClientChatMessage = {
  id: number;
  sender_type: "coach" | "client";
  body: string;
  created_at: string;
};

export async function apiClientBootstrap(body: {
  invite_code?: string;
  name?: string;
}): Promise<void> {
  const res = await apiFetch(`${apiPrefix()}/auth/client/bootstrap`, {
    method: "POST",
    headers: await authHeadersJson(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseErr(res);
}

export async function apiGetClientMe(): Promise<ClientMe> {
  const res = await apiFetch(`${apiPrefix()}/client/me`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiListClientInvoices(): Promise<ClientInvoice[]> {
  const res = await apiFetch(`${apiPrefix()}/client/invoices?limit=100`, {
    headers: await authHeadersJson(),
  });
  if (!res.ok) await parseErr(res);
  const data = (await res.json()) as { items: ClientInvoice[] };
  return data.items ?? [];
}

export async function apiGetClientInvoice(id: number): Promise<ClientInvoice> {
  const res = await apiFetch(`${apiPrefix()}/client/invoices/${id}`, {
    headers: await authHeadersJson(),
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiListClientMessages(): Promise<ClientChatMessage[]> {
  const res = await apiFetch(`${apiPrefix()}/client/messages`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  const data = (await res.json()) as { items: ClientChatMessage[] };
  return data.items ?? [];
}

export async function apiSendClientMessage(body: string): Promise<ClientChatMessage> {
  const res = await apiFetch(`${apiPrefix()}/client/messages`, {
    method: "POST",
    headers: await authHeadersJson(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) await parseErr(res);
  const data = (await res.json()) as { message: ClientChatMessage };
  return data.message;
}

export async function fetchClientInvoicePdf(invoiceId: number): Promise<ArrayBuffer> {
  const res = await apiFetch(`${apiPrefix()}/client/invoices/${invoiceId}/pdf`, {
    headers: await authBearerHeaders(),
  });
  if (!res.ok) await parseErr(res);
  return res.arrayBuffer();
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

export async function apiListClientReminders(): Promise<ClientReminder[]> {
  const res = await apiFetch(`${apiPrefix()}/client/reminders`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  const data = (await res.json()) as { items: ClientReminder[] };
  return data.items ?? [];
}

export async function apiListClientPromotions(): Promise<ClientPromotion[]> {
  const res = await apiFetch(`${apiPrefix()}/client/promotions`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  const data = (await res.json()) as { items: ClientPromotion[] };
  return data.items ?? [];
}

export function reminderRoute(reminder: ClientReminder): string {
  if (reminder.action === "invoices") {
    return reminder.related_id != null ? `/(tabs)/invoices/${reminder.related_id}` : "/(tabs)/invoices";
  }
  if (reminder.action === "plans") return "/(tabs)/workout";
  if (reminder.action === "messages") return "/(tabs)/messages";
  if (reminder.action === "promotions") return "/(tabs)/promotions";
  return "/(tabs)/home";
}

export function formatPlanMoney(amount: number | string | null | undefined, currency: string): string {
  if (amount == null || amount === "") return "";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}
