/**
 * Coach console — dark-first neutral palette for a modern sports product.
 * Keep the UI mostly black/charcoal with light icons and text; orange is a
 * restrained accent for primary actions and focus only.
 */
export const coachBrand = {
  /** Muted orange accent, intentionally used sparingly */
  primary: "#f59e0b",
  primaryHover: "#fbbf24",
  primaryActive: "#d97706",
  primaryBgSoft: "rgba(245, 158, 11, 0.10)",
  primaryBgHover: "rgba(245, 158, 11, 0.06)",
  /** True neutral black, not warm brown */
  layoutBg: "#030303",
  /** Primary panels (cards, form surfaces) */
  surface: "#0c0c0d",
  /** Header, sider, slightly lifted chrome */
  surfaceElevated: "#151518",
  text: "#f7f7f8",
  textSecondary: "#a5a5ab",
  border: "rgba(255, 255, 255, 0.10)",
  borderSecondary: "rgba(255, 255, 255, 0.08)",
} as const;

/** Light shell — neutral white/gray with the same restrained orange accent. */
export const coachBrandLight = {
  primary: "#d97706",
  primaryHover: "#f59e0b",
  primaryActive: "#b45309",
  primaryBgSoft: "rgba(217, 119, 6, 0.10)",
  primaryBgHover: "rgba(217, 119, 6, 0.05)",
  layoutBg: "#f4f4f5",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: "#111113",
  textSecondary: "#64646c",
  border: "rgba(17, 17, 19, 0.10)",
  borderSecondary: "rgba(17, 17, 19, 0.06)",
} as const;

export type CoachBrandPalette = typeof coachBrand;
