import type { CSSProperties } from "react";

import { WORKOUT_ROW_RAIL_WIDTH } from "./constants";

/** Standalone exercise — flat list section, no enclosing box.
 *  Sets within still render their own row borders.
 *  The wrapping page-level Card provides the paper. */
export const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 12,
  padding: 0,
  border: "none",
  background: "transparent",
  boxShadow: "none",
};

/** Exercise inside a block — same flat treatment, with a top divider for separation. */
// blockAccent is no longer used; kept as a parameter for call-site stability.
export function exerciseCardShellInBlock(_blockAccent: string): CSSProperties {
  return {
    marginBottom: 8,
    padding: 0,
    border: "none",
    background: "transparent",
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
