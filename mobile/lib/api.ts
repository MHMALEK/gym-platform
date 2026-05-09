import { apiBaseUrl, apiPrefix } from "./config";
import { getAccessToken } from "./token";

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
        `Cannot reach API at ${base}. Start the backend with uvicorn --host 0.0.0.0 --port 8000. ` +
          `Android emulator: use http://10.0.2.2:8000 in EXPO_PUBLIC_API_URL (not 127.0.0.1). ` +
          `Physical device: use your computer's LAN IP (same Wi‑Fi). ` +
          `After changing .env, restart Expo with cache clear: npx expo start -c. (${raw})`,
      );
    }
    throw e;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
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

export async function apiBootstrap(): Promise<void> {
  const res = await apiFetch(`${apiPrefix()}/auth/bootstrap`, {
    method: "POST",
    headers: await authHeadersJson(),
  });
  if (!res.ok) await parseErr(res);
}

export async function apiGetMe(): Promise<{ id: number; name?: string; email?: string | null }> {
  const res = await apiFetch(`${apiPrefix()}/me`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export type ListResponse<T> = { items: T[]; total: number };

export async function apiGetList<T>(
  path: string,
  search?: Record<string, string | number | undefined>,
): Promise<ListResponse<T>> {
  const sp = new URLSearchParams();
  sp.set("limit", String(search?.limit ?? 50));
  sp.set("offset", String(search?.offset ?? 0));
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (k === "limit" || k === "offset") continue;
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
  }
  const res = await apiFetch(`${apiPrefix()}/${path}?${sp}`, {
    headers: await authHeadersJson(),
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiGetOne<T>(path: string, id: string | number): Promise<T> {
  const res = await apiFetch(`${apiPrefix()}/${path}/${id}`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiGetPath<T>(path: string): Promise<T> {
  const res = await apiFetch(`${apiPrefix()}/${path}`, { headers: await authHeadersJson() });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(`${apiPrefix()}/${path}`, {
    method: "POST",
    headers: await authHeadersJson(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiPatch<T>(path: string, id: string | number, body: unknown): Promise<T> {
  const res = await apiFetch(`${apiPrefix()}/${path}/${id}`, {
    method: "PATCH",
    headers: await authHeadersJson(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiPutPath<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(`${apiPrefix()}/${path}`, {
    method: "PUT",
    headers: await authHeadersJson(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseErr(res);
  return res.json();
}

export async function apiDelete(path: string, id: string | number): Promise<void> {
  const res = await apiFetch(`${apiPrefix()}/${path}/${id}`, {
    method: "DELETE",
    headers: await authHeadersJson(),
  });
  if (!res.ok) await parseErr(res);
}
