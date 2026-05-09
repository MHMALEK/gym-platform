/**
 * Coach console — modern, neutral indigo accent on cool charcoal/cream
 * neutrals. Inspired by Linear / Vercel / Stripe; a step away from the
 * gym-bro field-green look. Green survives as a `success` semantic
 * color (chips, paid status), not the primary brand color.
 */
export const coachBrand = {
  /** Soft electric indigo — strong on dark surfaces without being neon */
  primary: "#818cf8",
  primaryHover: "#a5b4fc",
  primaryActive: "#6366f1",
  primaryBgSoft: "rgba(129, 140, 248, 0.18)",
  primaryBgHover: "rgba(129, 140, 248, 0.10)",
  /** Near-black with a faint cool tint (graphite, not warm) */
  layoutBg: "#0b0c10",
  /** Primary panels (cards, form surfaces) */
  surface: "#15171c",
  /** Header, sider, slightly lifted chrome */
  surfaceElevated: "#1c1f26",
  text: "#e5e7eb",
  textSecondary: "#9ca3af",
  border: "rgba(148, 163, 184, 0.18)",
  borderSecondary: "rgba(148, 163, 184, 0.08)",
} as const;

/** Light shell — same indigo accent, cool neutrals for daytime use.
 *  Page bg is grey, surfaces are pure white — paper lifted off page. */
export const coachBrandLight = {
  primary: "#6366f1",
  primaryHover: "#818cf8",
  primaryActive: "#4f46e5",
  primaryBgSoft: "rgba(99, 102, 241, 0.12)",
  primaryBgHover: "rgba(99, 102, 241, 0.06)",
  layoutBg: "#f1f5f9",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: "#0f172a",
  textSecondary: "#64748b",
  border: "rgba(15, 23, 42, 0.10)",
  borderSecondary: "rgba(15, 23, 42, 0.06)",
} as const;

export type CoachBrandPalette = typeof coachBrand;
