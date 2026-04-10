const base = import.meta.env.VITE_API_URL ?? "";

export const apiPrefix = `${base}/api/v1`;

export function authHeaders(): HeadersInit {
  const t = localStorage.getItem("access_token");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** GET/HEAD requests: no `Content-Type` so intermediaries do not treat the call as JSON. */
export function authBearerHeaders(): HeadersInit {
  const t = localStorage.getItem("access_token");
  const h: Record<string, string> = {};
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function apiBootstrap(): Promise<void> {
  const res = await fetch(`${apiPrefix}/auth/bootstrap`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}
