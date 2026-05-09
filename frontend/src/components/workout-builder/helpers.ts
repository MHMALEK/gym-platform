import {
  contiguousLegacyExerciseRun,
  exerciseGroupRange,
  type WorkoutLine,
} from "../../lib/workoutLineModel";

/** Run-segment for a legacy "one row per set" line so the renderer can pick borders. */
export function legacyRowUISegment(
  items: WorkoutLine[],
  index: number,
): "single" | "runFirst" | "runMiddle" | "runLast" {
  const [lo, hi] = contiguousLegacyExerciseRun(items, index);
  if (lo === hi) return "single";
  if (index === lo) return "runFirst";
  if (index === hi) return "runLast";
  return "runMiddle";
}

/** Inclusive [lo, hi] range of contiguous rows sharing this row's block_id. */
export function contiguousBlockRange(items: WorkoutLine[], index: number): [number, number] {
  const bid = items[index]?.block_id;
  if (!bid) return [index, index];
  let lo = index;
  while (lo > 0 && items[lo - 1]?.block_id === bid) lo--;
  let hi = index;
  while (hi < items.length - 1 && items[hi + 1]?.block_id === bid) hi++;
  return [lo, hi];
}

/** How many exercise bundles (heads) sit in this block slice [blockStart, blockEnd] inclusive. */
export function countExerciseBundlesInBlockSlice(
  items: WorkoutLine[],
  blockStart: number,
  blockEnd: number,
): number {
  let n = 0;
  let p = blockStart;
  while (p <= blockEnd && p < items.length) {
    const [, hi] = exerciseGroupRange(items, p);
    n += 1;
    p = hi + 1;
  }
  return n;
}

/** Move the whole exercise (or whole block) at `activeIndex` to land near `overIndex`. */
export function reorderWithBlocks(
  items: WorkoutLine[],
  activeIndex: number,
  overIndex: number,
): WorkoutLine[] {
  if (activeIndex === overIndex) return items;
  const [lo, hi] = contiguousBlockRange(items, activeIndex);
  if (overIndex >= lo && overIndex <= hi) return items;
  const chunk = items.slice(lo, hi + 1);
  const chunkLen = chunk.length;
  const rest = [...items.slice(0, lo), ...items.slice(hi + 1)];
  let insertBefore: number;
  if (overIndex > hi) {
    const [tLo, tHi] = exerciseGroupRange(items, overIndex);
    const targetLen = tHi - tLo + 1;
    insertBefore = overIndex - chunkLen + targetLen;
  } else {
    insertBefore = overIndex;
  }
  insertBefore = Math.max(0, Math.min(insertBefore, rest.length));
  return [...rest.slice(0, insertBefore), ...chunk, ...rest.slice(insertBefore)].map((row, i) => ({
    ...row,
    sort_order: i,
  }));
}

/** Stable color from a block id — gym-equipment-marker hue. */
export function blockAccent(blockId: string): string {
  let h = 0;
  for (let i = 0; i < blockId.length; i++) h = (h * 31 + blockId.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 54%)`;
}
