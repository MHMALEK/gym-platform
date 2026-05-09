import type { CSSProperties } from "react";

import { WORKOUT_ROW_RAIL_WIDTH } from "./constants";

/** Standalone exercise — bordered card so each exercise reads as one unit.
 *  Block containers stay rail-only (no enclosing border) so grouped
 *  exercises don't end up double-bordered. */
export const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 12,
  padding: 0,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "transparent",
  boxShadow: "none",
  overflow: "hidden",
};

/** Exercise inside a block — same single border, just a touch tighter. */
// blockAccent is no longer used; kept as a parameter for call-site stability.
export function exerciseCardShellInBlock(_blockAccent: string): CSSProperties {
  return {
    marginBottom: 8,
    padding: 0,
    borderRadius: 6,
    border: "1px solid var(--app-border)",
    background: "transparent",
    boxShadow: "none",
    overflow: "hidden",
  };
}

export const rowActionsRailStyle: CSSProperties = {
  width: WORKOUT_ROW_RAIL_WIDTH,
  flexShrink: 0,
  padding: "10px 6px",
  borderRight: "1px solid var(--app-border)",
  background: "color-mix(in srgb, var(--app-surface) 65%, transparent)",
};
