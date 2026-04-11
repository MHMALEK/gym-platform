/** Shared tab ids + hash routing for client Show and Edit pages. */

import type { SxProps, Theme } from "@mui/material/styles";

export const clientDetailTabsSx: SxProps<Theme> = {
  borderBottom: 1,
  borderColor: "divider",
  mb: 2,
  "& .MuiTab-root": {
    minHeight: 44,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.9375rem",
  },
};

export type ClientDetailTab = "profile" | "workout" | "invoices" | "membership";

export function tabFromHash(hash: string): ClientDetailTab {
  const h = hash.replace(/^#/, "");
  if (h === "financial") return "invoices";
  if (h === "workout" || h === "invoices" || h === "membership") return h;
  return "profile";
}

export function hashForTab(tab: ClientDetailTab): string {
  if (tab === "profile") return "";
  return tab;
}

export const clientTabScrollIds: Record<Exclude<ClientDetailTab, "profile">, string> = {
  workout: "client-tab-workout",
  invoices: "client-tab-invoices",
  membership: "client-tab-membership",
};
