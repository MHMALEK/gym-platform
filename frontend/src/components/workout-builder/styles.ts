import type { CSSProperties } from "react";

import { WORKOUT_ROW_RAIL_WIDTH } from "./constants";

/** Standalone exercise card — flat surface + subtle ring (theme-aware) */
export const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 14,
  padding: 0,
  borderRadius: 16,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-elevated)",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 40px rgba(0, 0, 0, 0.08)",
};

/** Nested card inside a block — accent rail only */
export function exerciseCardShellInBlock(blockAccent: string): CSSProperties {
  return {
    marginBottom: 10,
    padding: 0,
    borderRadius: 12,
    border: "1px solid var(--app-border)",
    borderLeft: `3px solid ${blockAccent}`,
    background: "var(--app-surface-elevated)",
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
