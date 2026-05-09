import type { CSSProperties } from "react";

import { WORKOUT_ROW_RAIL_WIDTH } from "./constants";

/** Standalone exercise card — paper lifted off the page bg. */
export const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 10,
  padding: 0,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-elevated)",
  // Soft paper shadow; near-invisible on dark mode (already lifts via bg contrast).
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
};

/** Nested card inside a block — quieter, recedes inside the block container. */
// blockAccent is no longer used; kept as a parameter for call-site stability.
export function exerciseCardShellInBlock(_blockAccent: string): CSSProperties {
  return {
    marginBottom: 6,
    padding: 0,
    borderRadius: 8,
    border: "1px solid var(--app-border)",
    background: "var(--app-surface)",
    boxShadow: "none",
  };
}

export const rowActionsRailStyle: CSSProperties = {
  width: WORKOUT_ROW_RAIL_WIDTH,
  flexShrink: 0,
  padding: "10px 6px",
  borderRight: "1px solid var(--app-border)",
  background: "color-mix(in srgb, var(--app-surface) 65%, transparent)",
};
