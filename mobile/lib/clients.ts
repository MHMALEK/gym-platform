import { apiGetList, apiGetOne, apiPost, apiPatch, apiDelete, type ListResponse } from "./api";

export type ClientRow = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: string;
  account_status?: string;
  weight_kg?: string | number | null;
  height_cm?: string | number | null;
  goal?: string | null;
  goal_type_id?: number | null;
  subscription_plan_template_id?: number | null;
};

export type ClientDetailResponse = {
  client: ClientRow;
  subscriptions_preview?: unknown;
  active_subscriptions?: unknown;
};

export async function listClients(page: { limit: number; offset: number }): Promise<ListResponse<ClientRow>> {
  return apiGetList<ClientRow>("clients", { limit: page.limit, offset: page.offset });
}

export async function getClient(id: number): Promise<ClientRow> {
  const json = await apiGetOne<ClientDetailResponse>("clients", id);
  return json.client;
}

export type ClientCreateBody = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  goal_type_id?: number | null;
  goal?: string | null;
  subscription_plan_template_id?: number | null;
  status?: string;
  account_status?: string;
};

export async function createClient(body: ClientCreateBody): Promise<ClientRow> {
  return apiPost<ClientRow>("clients", body);
}

export async function updateClient(id: number, body: Partial<ClientCreateBody>): Promise<ClientRow> {
  return apiPatch<ClientRow>("clients", id, body);
}

export async function deleteClient(id: number): Promise<void> {
  await apiDelete("clients", id);
}
