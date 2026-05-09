import type { WorkoutBlockType } from "../../lib/workoutLineModel";

export const BLOCK_OPTIONS: { value: WorkoutBlockType; labelKey: string }[] = [
  { value: "superset", labelKey: "workouts.block.superset" },
  { value: "circuit", labelKey: "workouts.block.circuit" },
  { value: "tri_set", labelKey: "workouts.block.tri_set" },
  { value: "giant_set", labelKey: "workouts.block.giant_set" },
  { value: "dropset", labelKey: "workouts.block.dropset" },
];

/** Drop on another exercise's name area to group (merge) after that exercise. */
export const MERGE_INTO_PREFIX = "merge-into:";

/** Left action column width — keep merge-drop `marginLeft` in sync */
export const WORKOUT_ROW_RAIL_WIDTH = 44;

export function mergeIntoDroppableId(headLocalId: string) {
  return `${MERGE_INTO_PREFIX}${headLocalId}`;
}
