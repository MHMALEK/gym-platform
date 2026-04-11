/**
 * Coach console — arena charcoal + field green (dark) and clean light variant.
 * Sporting feel: high-energy accent on deep turf-toned neutrals.
 */
export const coachBrand = {
  /** Field green — strong on dark surfaces, reads “performance / go” */
  primary: "#22c55e",
  primaryHover: "#4ade80",
  primaryActive: "#16a34a",
  primaryBgSoft: "rgba(34, 197, 94, 0.2)",
  primaryBgHover: "rgba(34, 197, 94, 0.12)",
  /** Near-black with a subtle green shift (stadium night) */
  layoutBg: "#0a0d0c",
  /** Primary panels (cards, form surfaces) */
  surface: "#131a17",
  /** Header, sider, slightly lifted chrome */
  surfaceElevated: "#1a2420",
  text: "#e2e8f0",
  textSecondary: "#94a3b8",
  border: "rgba(148, 163, 184, 0.2)",
  borderSecondary: "rgba(148, 163, 184, 0.1)",
} as const;

/** Light shell — same accent, high-contrast neutrals for daytime use */
export const coachBrandLight = {
  primary: "#16a34a",
  primaryHover: "#22c55e",
  primaryActive: "#15803d",
  primaryBgSoft: "rgba(22, 163, 74, 0.14)",
  primaryBgHover: "rgba(22, 163, 74, 0.08)",
  layoutBg: "#f1f5f9",
  surface: "#ffffff",
  surfaceElevated: "#f8fafc",
  text: "#0f172a",
  textSecondary: "#64748b",
  border: "rgba(15, 23, 42, 0.12)",
  borderSecondary: "rgba(15, 23, 42, 0.08)",
} as const;

export type CoachBrandPalette = typeof coachBrand;
