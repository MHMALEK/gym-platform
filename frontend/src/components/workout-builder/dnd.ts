import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

import { MERGE_INTO_PREFIX, mergeIntoDroppableId } from "./constants";

/** When several merge targets overlap, pick the nearest to the drag pointer center. */
function pickNearestCollision(
  args: Parameters<CollisionDetection>[0],
  hits: ReturnType<CollisionDetection>,
): ReturnType<CollisionDetection> {
  if (hits.length <= 1) return hits;
  const cr = args.collisionRect;
  const acx = cr.left + cr.width / 2;
  const acy = cr.top + cr.height / 2;
  let best = hits[0];
  let bestD = Infinity;
  for (const hit of hits) {
    const node = args.droppableContainers.find((d) => d.id === hit.id);
    const r = node?.rect.current;
    if (!r) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = (cx - acx) ** 2 + (cy - acy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = hit;
    }
  }
  return [best];
}

/**
 * Custom collision detection: prefers merge-target containers (drop on another
 * exercise's name to group) over plain reorder when the pointer is inside one.
 */
export function workoutCollisionDetection(args: Parameters<CollisionDetection>[0]) {
  const activeId = String(args.active.id);
  const mergeContainers = args.droppableContainers.filter((c) => {
    const id = String(c.id);
    return id.startsWith(MERGE_INTO_PREFIX) && id !== mergeIntoDroppableId(activeId);
  });
  if (mergeContainers.length > 0) {
    const mergeArgs = { ...args, droppableContainers: mergeContainers };
    const pointerMerge = pointerWithin(mergeArgs);
    if (pointerMerge.length > 0) {
      return pickNearestCollision(args, pointerMerge);
    }
  }

  const sortableOnly = args.droppableContainers.filter(
    (c) => !String(c.id).startsWith(MERGE_INTO_PREFIX),
  );
  return closestCenter({ ...args, droppableContainers: sortableOnly });
}
