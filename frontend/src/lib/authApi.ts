import { apiPrefix, authHeaders, httpErrorFromResponse } from "./api";

export type AuthWhoami =
  | { role: "coach"; id: number; name: string; email: string }
  | { role: "client"; id: number; name: string; email: string | null; coach_id: number; coach_name: string }
  | { role: null };

export type CoachPublicPreview = {
  name: string;
  tagline: string | null;
  invite_code: string;
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
  coaching_plan: {
    workout_plan: string | null;
    workout_rich_html: string | null;
    program_venue?: string | null;
    diet_plan: string | null;
    diet_meals: unknown[];
    workout_items: unknown[];
    updated_at: string | null;
  };
};

export const USER_ROLE_KEY = "user_role";

export function setUserRole(role: "coach" | "client"): void {
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function getUserRole(): "coach" | "client" | null {
  const r = localStorage.getItem(USER_ROLE_KEY);
  return r === "coach" || r === "client" ? r : null;
}

export function clearUserRole(): void {
  localStorage.removeItem(USER_ROLE_KEY);
}

export async function apiWhoami(): Promise<AuthWhoami> {
  const res = await fetch(`${apiPrefix}/auth/whoami`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export async function apiBootstrap(): Promise<void> {
  const res = await fetch(`${apiPrefix}/auth/bootstrap`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
}

export async function apiClientBootstrap(body: {
  invite_code?: string;
  name?: string;
}): Promise<void> {
  const res = await fetch(`${apiPrefix}/auth/client/bootstrap`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
}

export async function apiCoachPreview(inviteCode: string): Promise<CoachPublicPreview> {
  const res = await fetch(`${apiPrefix}/auth/coach-preview/${encodeURIComponent(inviteCode)}`);
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export async function apiClientMe(): Promise<ClientMe> {
  const res = await fetch(`${apiPrefix}/client/me`, { headers: authHeaders() });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
  return res.json();
}

export const DEV_CLIENT_TOKEN = "dev-client";
