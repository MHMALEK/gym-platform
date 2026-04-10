/** Format a numeric amount with a currency code for display. */
export function formatMoney(
  amount: number | string | null | undefined,
  currency = "USD",
  locale?: string,
): string {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "—";
  const loc = locale?.startsWith("fa") ? "fa-IR" : locale && locale.length >= 2 ? locale : "en-US";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
