import { apiGetList, apiGetOne, apiPost, apiPatch, apiDelete, type ListResponse } from "./api";

export type InvoiceRow = {
  id: number;
  client_id: number;
  reference?: string | null;
  amount?: string | number | null;
  currency: string;
  due_date?: string | null;
  status: string;
  notes?: string | null;
  internal_notes?: string | null;
  paid_at?: string | null;
  payment_provider?: string | null;
  external_payment_id?: string | null;
  created_at?: string;
  client?: { id: number; name: string } | null;
};

export async function listInvoices(
  page: { limit: number; offset: number },
  filters?: { client_id?: number; status?: string },
): Promise<ListResponse<InvoiceRow>> {
  return apiGetList<InvoiceRow>("invoices", {
    limit: page.limit,
    offset: page.offset,
    client_id: filters?.client_id,
    status: filters?.status,
  });
}

export async function getInvoice(id: number): Promise<InvoiceRow> {
  return apiGetOne<InvoiceRow>("invoices", id);
}

export type InvoiceCreateBody = {
  client_id: number;
  reference?: string | null;
  amount?: number | null;
  currency?: string;
  due_date?: string | null;
  status?: string;
  notes?: string | null;
  internal_notes?: string | null;
};

export async function createInvoice(body: InvoiceCreateBody): Promise<InvoiceRow> {
  return apiPost<InvoiceRow>("invoices", body);
}

export type InvoiceUpdateBody = {
  reference?: string | null;
  amount?: number | null;
  currency?: string | null;
  due_date?: string | null;
  status?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  paid_at?: string | null;
  payment_provider?: string | null;
  external_payment_id?: string | null;
};

export async function updateInvoice(id: number, body: InvoiceUpdateBody): Promise<InvoiceRow> {
  return apiPatch<InvoiceRow>("invoices", id, body);
}

export async function deleteInvoice(id: number): Promise<void> {
  await apiDelete("invoices", id);
}
