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

export type { ClientMe };
