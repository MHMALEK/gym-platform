import type { CSSProperties } from "react";

import { WORKOUT_ROW_RAIL_WIDTH } from "./constants";

/** Standalone exercise — flat bordered row, no paper chrome.
 *  The wrapping page-level Card already provides paper. */
export const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 8,
  padding: 0,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "transparent",
  boxShadow: "none",
};

/** Exercise inside a block — even quieter, hairline only. */
// blockAccent is no longer used; kept as a parameter for call-site stability.
export function exerciseCardShellInBlock(_blockAccent: string): CSSProperties {
  return {
    marginBottom: 6,
    padding: 0,
    borderRadius: 6,
    border: "1px solid var(--app-border)",
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
