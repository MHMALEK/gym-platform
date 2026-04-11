/**
 * Thin HTTP client for Gym Coach FastAPI (coach auth via X-API-Key, or dev bypass).
 */

function envTruthy(name: string): boolean {
  const v = process.env[name];
  return v === "1" || v === "true" || v === "yes";
}

export function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = (process.env.GYM_COACH_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const devNoAuth = envTruthy("GYM_COACH_DEV_NO_AUTH");
  const apiKey = process.env.GYM_COACH_API_KEY ?? "";
  if (!apiKey && !devNoAuth) {
    throw new Error(
      "GYM_COACH_API_KEY is not set. Create a key via POST /api/v1/me/api-keys (Firebase session), export it, or set GYM_COACH_DEV_NO_AUTH=true with backend DEV_BYPASS_AUTH=true."
    );
  }
  return { baseUrl, apiKey };
}

export async function gymCoachApi(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<unknown> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  let body: BodyInit | undefined = init.body ?? undefined;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(url, { ...init, headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gym Coach API ${res.status}: ${text || res.statusText}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
