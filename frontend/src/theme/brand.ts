/**
 * Coach console — dark athletic UI (charcoal + electric teal).
 * Maps to Ant Design 5 tokens; adjust here to re-skin the whole app.
 */
export const coachBrand = {
  /** Teal — strong on dark surfaces */
  primary: "#14b8a6",
  primaryHover: "#2dd4bf",
  primaryActive: "#0d9488",
  primaryBgSoft: "rgba(20, 184, 166, 0.18)",
  primaryBgHover: "rgba(20, 184, 166, 0.12)",
  /** Near-black with a cool blue shift */
  layoutBg: "#0b0e13",
  /** Primary panels (cards, form surfaces) */
  surface: "#121826",
  /** Header, sider, slightly lifted chrome */
  surfaceElevated: "#1a2234",
  text: "#e2e8f0",
  textSecondary: "#94a3b8",
  border: "rgba(148, 163, 184, 0.2)",
  borderSecondary: "rgba(148, 163, 184, 0.1)",
} as const;
