/**
 * Coach console brand — tuned for clarity (admin SaaS) with a fitness-adjacent accent.
 * Maps to Ant Design 5 tokens; adjust here to re-skin the whole app.
 */
export const coachBrand = {
  /** Teal-600 — energetic but professional on white & gray */
  primary: "#0d9488",
  primaryActive: "#0f766e",
  primaryBgSoft: "rgba(13, 148, 136, 0.12)",
  primaryBgHover: "rgba(13, 148, 136, 0.08)",
  /** Cool layout wash (not pure gray) */
  layoutBg: "#f0f4f3",
  surface: "#ffffff",
  /** Slate scale for type */
  text: "#0f172a",
  textSecondary: "#64748b",
  border: "#e2e8f0",
} as const;
