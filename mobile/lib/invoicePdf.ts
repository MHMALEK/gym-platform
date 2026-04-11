import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { apiPrefix } from "./config";
import { authBearerHeaders } from "./api";

export async function shareInvoicePdf(invoiceId: number, reference?: string | null): Promise<void> {
  const res = await fetch(`${apiPrefix()}/invoices/${invoiceId}/pdf`, {
    headers: await authBearerHeaders(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.trim() || `HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  const safeRef = (reference ?? `invoice-${invoiceId}`).replace(/[^\w.-]+/g, "_");
  const file = new File(Paths.cache, `${safeRef}.pdf`);
  file.create({ overwrite: true });
  file.write(new Uint8Array(ab));
  const can = await Sharing.isAvailableAsync();
  if (can) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  }
}
