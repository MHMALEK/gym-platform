import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilter,
  CustomParams,
  CustomResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  LogicalFilter,
  Pagination,
  UpdateParams,
  UpdateResponse,
} from "@refinedev/core";

import { apiPrefix, authHeaders } from "./lib/api";

function pathForResource(resource: string): string {
  const m: Record<string, string> = {
    "directory-exercises": "directory/exercises",
    "directory-training-plans": "directory/training-plans",
    "directory-goal-types": "directory/goal-types",
    "directory-muscle-groups": "directory/muscle-groups",
  };
  return m[resource] ?? resource;
}

async function parseErr(res: Response): Promise<never> {
  const t = await res.text();
  throw new Error(t || res.statusText);
}

function isLogicalFilter(f: CrudFilter): f is LogicalFilter {
  return "field" in f && "operator" in f;
}

function appendListQueryParams(searchParams: URLSearchParams, resource: string, filters?: CrudFilter[]) {
  if (!filters?.length) return;
  if (resource === "invoices") {
    for (const f of filters) {
      if (!isLogicalFilter(f) || f.operator !== "eq") continue;
      if (f.field === "client_id" && f.value != null && f.value !== "") {
        searchParams.set("client_id", String(f.value));
      }
      if (f.field === "status" && f.value != null && f.value !== "") {
        searchParams.set("status", String(f.value));
      }
    }
    return;
  }
  if (resource === "exercises" || resource === "directory-exercises") {
    for (const f of filters) {
      if (!isLogicalFilter(f)) continue;
      if (f.field === "q" && f.value != null && String(f.value).trim()) {
        searchParams.set("q", String(f.value).trim());
      }
      if (f.field === "venue_type" && f.value != null && String(f.value) !== "") {
        searchParams.set("venue_type", String(f.value));
      }
    }
  }
  if (resource === "training-plans") {
    for (const f of filters) {
      if (!isLogicalFilter(f)) continue;
      if (f.field === "venue_type" && f.value != null && String(f.value) !== "") {
        searchParams.set("venue_type", String(f.value));
      }
    }
  }
}

export const dataProvider: DataProvider = {
  getApiUrl: () => apiPrefix,

  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    filters,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    if (resource === "dashboard") {
      return { data: [] as TData[], total: 0 };
    }
    const path = pathForResource(resource);
    const { current = 1, pageSize = 20 } = (pagination ?? {}) as Pagination;
    const offset = (current - 1) * pageSize;
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(pageSize));
    searchParams.set("offset", String(offset));
    appendListQueryParams(searchParams, resource, filters);
    const url = `${apiPrefix}/${path}?${searchParams.toString()}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) await parseErr(res);
    const json = await res.json();
    return {
      data: (json.items ?? []) as TData[],
      total: json.total ?? 0,
    };
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: GetOneParams): Promise<GetOneResponse<TData>> => {
    const path = pathForResource(resource);
    const res = await fetch(`${apiPrefix}/${path}/${id}`, { headers: authHeaders() });
    if (!res.ok) await parseErr(res);
    const json = await res.json();
    if (resource === "clients") {
      const c = json.client;
      const data = {
        ...c,
        _subscriptions_preview: json.subscriptions_preview,
        _active_subscriptions: json.active_subscriptions,
      } as TData;
      return { data };
    }
    return { data: json as TData };
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    variables,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    const path = pathForResource(resource);
    const res = await fetch(`${apiPrefix}/${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(variables),
    });
    if (!res.ok) await parseErr(res);
    return { data: (await res.json()) as TData };
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    const path = pathForResource(resource);
    const res = await fetch(`${apiPrefix}/${path}/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(variables),
    });
    if (!res.ok) await parseErr(res);
    return { data: (await res.json()) as TData };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const path = pathForResource(resource);
    const res = await fetch(`${apiPrefix}/${path}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) await parseErr(res);
    return { data: { id } as TData };
  },

  getMany: async () => ({ data: [] }),

  createMany: async () => {
    throw new Error("createMany not implemented");
  },

  deleteMany: async () => {
    throw new Error("deleteMany not implemented");
  },

  updateMany: async () => {
    throw new Error("updateMany not implemented");
  },

  custom: async <TData extends BaseRecord = BaseRecord>({
    url,
    method,
    payload,
    query,
    headers: extraHeaders,
  }: CustomParams): Promise<CustomResponse<TData>> => {
    const qs =
      query && typeof query === "object"
        ? (() => {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(query as Record<string, unknown>)) {
              if (v === undefined || v === null) continue;
              sp.set(k, String(v));
            }
            const s = sp.toString();
            return s ? `?${s}` : "";
          })()
        : "";
    const m = method.toUpperCase();
    const isForm = typeof FormData !== "undefined" && payload instanceof FormData;
    const h: Record<string, string> = {};
    const t = localStorage.getItem("access_token");
    if (t) h.Authorization = `Bearer ${t}`;
    if (!isForm && m !== "GET" && m !== "HEAD") {
      h["Content-Type"] = "application/json";
    }
    if (extraHeaders && typeof extraHeaders === "object") {
      Object.assign(h, extraHeaders as Record<string, string>);
    }
    const res = await fetch(`${apiPrefix}${url}${qs}`, {
      method: m,
      headers: h,
      body:
        m === "GET" || m === "HEAD"
          ? undefined
          : isForm
            ? (payload as FormData)
            : payload !== undefined && payload !== null
              ? JSON.stringify(payload)
              : undefined,
    });
    if (!res.ok) await parseErr(res);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return { data: (await res.json()) as TData };
    }
    return { data: {} as TData };
  },
};
