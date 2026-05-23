import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { fetchClientInvoicePdf } from "./api";

export async function shareClientInvoicePdf(
  invoiceId: number,
  reference?: string | null,
): Promise<void> {
  const ab = await fetchClientInvoicePdf(invoiceId);
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
  } else {
    throw new Error("Sharing is not available on this device.");
  }
}
