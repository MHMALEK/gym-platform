export type WorkoutBlockType = "superset" | "circuit" | "tri_set" | "giant_set" | "dropset";

export type WorkoutRowType = "legacy_line" | "exercise" | "set";

export type WorkoutLine = {
  localId: string;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  /** Load in kilograms. Null = unspecified. */
  weight_kg: number | null;
  /** Rate of Perceived Exertion (0–10, typically 0.5 increments). Null = unspecified. */
  rpe: number | null;
  /** Freeform tempo string, e.g. "3-1-1-0". Null = unspecified. */
  tempo: string | null;
  notes: string | null;
  exercise_name?: string;
  block_id: string | null;
  block_type: WorkoutBlockType | null;
  block_sequence?: number | null;
  row_type: WorkoutRowType;
  exercise_instance_id: string | null;
};

export function newLocalId() {
  return crypto.randomUUID();
}

/** Legacy-only: consecutive rows that were the old “one row per set” shape. */
export function contiguousLegacyExerciseRun(items: WorkoutLine[], index: number): [number, number] {
  const row = items[index];
  if (!row || row.row_type !== "legacy_line") return [index, index];
  const eid = row.exercise_id;
  const bid = row.block_id ?? null;
  let lo = index;
  while (lo > 0) {
    const p = items[lo - 1];
    if (p.row_type !== "legacy_line") break;
    if (p.exercise_id === eid && (p.block_id ?? null) === bid) lo -= 1;
    else break;
  }
  let hi = index;
  while (hi < items.length - 1) {
    const n = items[hi + 1];
    if (n.row_type !== "legacy_line") break;
    if (n.exercise_id === eid && (n.block_id ?? null) === bid) hi += 1;
    else break;
  }
  return [lo, hi];
}

/** One exercise “card”: head + sets (same exercise_instance_id) or one legacy run. */
export function exerciseGroupRange(items: WorkoutLine[], index: number): [number, number] {
  const row = items[index];
  if (!row) return [index, index];
  if (row.row_type === "legacy_line") {
    return contiguousLegacyExerciseRun(items, index);
  }
  const iid = row.exercise_instance_id;
  if (!iid) return [index, index];
  let lo = index;
  while (lo > 0 && items[lo - 1].exercise_instance_id === iid) lo--;
  let hi = index;
  while (hi < items.length - 1 && items[hi + 1].exercise_instance_id === iid) hi++;
  return [lo, hi];
}

/** Top-level sortable ids: one per exercise bundle, in list order (for @dnd-kit/sortable). */
export function orderedExerciseHeadLocalIds(items: WorkoutLine[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < items.length) {
    const [lo, hi] = exerciseGroupRange(items, i);
    const head = items[lo];
    if (head) out.push(head.localId);
    i = hi + 1;
  }
  return out;
}

export function exerciseHeadIndex(items: WorkoutLine[], index: number): number {
  const row = items[index];
  if (!row) return index;
  if (row.row_type === "exercise") return index;
  if (row.row_type === "legacy_line") return index;
  let j = index;
  while (j >= 0 && items[j].row_type !== "exercise") j--;
  return j >= 0 ? j : index;
}

export function effectiveHead(items: WorkoutLine[], index: number): WorkoutLine {
  const hi = exerciseHeadIndex(items, index);
  return items[hi] ?? items[index];
}

export function setOrdinalInGroup(items: WorkoutLine[], index: number): number {
  const [lo, hi] = exerciseGroupRange(items, index);
  const row = items[index];
  if (!row) return 1;
  if (row.row_type === "legacy_line") {
    return index - lo + 1;
  }
  if (row.row_type === "exercise") return 0;
  let n = 0;
  for (let j = lo; j <= hi; j++) {
    if (items[j].row_type === "set") {
      n += 1;
      if (j === index) return n;
    }
  }
  return 1;
}

export function setCountInGroup(items: WorkoutLine[], index: number): number {
  const [lo, hi] = exerciseGroupRange(items, index);
  const head = items[lo];
  if (!head) return 1;
  if (head.row_type === "legacy_line") return hi - lo + 1;
  let n = 0;
  for (let j = lo; j <= hi; j++) {
    if (items[j].row_type === "set") n += 1;
  }
  return Math.max(1, n);
}

/** Display value: set row uses own field or inherits from head. */
export function effectiveNumeric(
  items: WorkoutLine[],
  index: number,
  field: "reps" | "duration_sec" | "rest_sec" | "weight_kg" | "rpe",
): number | null {
  const row = items[index];
  if (!row) return null;
  if (row.row_type !== "set") return row[field];
  const v = row[field];
  if (v != null) return v;
  const head = items[exerciseHeadIndex(items, index)];
  return head?.[field] ?? null;
}

export function effectiveText(
  items: WorkoutLine[],
  index: number,
  field: "notes" | "tempo",
): string | null {
  const row = items[index];
  if (!row) return null;
  if (row.row_type !== "set") return row[field];
  if (row[field] != null && row[field] !== "") return row[field];
  const head = items[exerciseHeadIndex(items, index)];
  return head?.[field] ?? null;
}

/** @deprecated use effectiveText(items, index, "notes") */
export function effectiveNotes(items: WorkoutLine[], index: number): string | null {
  return effectiveText(items, index, "notes");
}

export function isMergeDragRoot(items: WorkoutLine[], index: number): boolean {
  const row = items[index];
  if (!row) return false;
  if (row.row_type === "legacy_line") return true;
  if (row.row_type === "exercise") return true;
  if (row.row_type === "set") {
    const head = items[exerciseHeadIndex(items, index)];
    return head?.row_type === "exercise";
  }
  return false;
}

export function consolidateLegacyPlanRows(lines: WorkoutLine[]): WorkoutLine[] {
  const out: WorkoutLine[] = [];
  let i = 0;
  while (i < lines.length) {
    const row = lines[i];
    if (row.row_type !== "legacy_line") {
      out.push({ ...row });
      i += 1;
      continue;
    }
    let j = i;
    const bid = row.block_id ?? null;
    const eid = row.exercise_id;
    while (
      j < lines.length &&
      lines[j].row_type === "legacy_line" &&
      lines[j].exercise_id === eid &&
      (lines[j].block_id ?? null) === bid
    ) {
      j += 1;
    }
    const run = lines.slice(i, j);
    const iid = newLocalId();
    const headSrc = run[0];
    const head: WorkoutLine = {
      ...headSrc,
      localId: newLocalId(),
      row_type: "exercise",
      exercise_instance_id: iid,
      sets: null,
    };
    out.push(head);
    const eq = (a: number | null | undefined, b: number | null | undefined) =>
      a === b || (a == null && b == null);
    for (let k = 0; k < run.length; k++) {
      const src = run[k];
      out.push({
        ...src,
        localId: newLocalId(),
        row_type: "set",
        exercise_instance_id: iid,
        sets: null,
        reps: k === 0 ? null : eq(src.reps, head.reps) ? null : src.reps,
        duration_sec: k === 0 ? null : eq(src.duration_sec, head.duration_sec) ? null : src.duration_sec,
        rest_sec: k === 0 ? null : eq(src.rest_sec, head.rest_sec) ? null : src.rest_sec,
        weight_kg: k === 0 ? null : eq(src.weight_kg, head.weight_kg) ? null : src.weight_kg,
        rpe: k === 0 ? null : eq(src.rpe, head.rpe) ? null : src.rpe,
        tempo:
          k === 0
            ? null
            : (src.tempo ?? null) === (head.tempo ?? null)
              ? null
              : src.tempo ?? null,
        notes:
          k === 0
            ? null
            : (src.notes ?? null) === (head.notes ?? null)
              ? null
              : src.notes ?? null,
      });
    }
    i = j;
  }
  return out.map((r, idx) => ({ ...r, sort_order: idx }));
}

export function newExerciseWithOneSetInBlock(
  ex: { id: number; name: string },
  blockId: string | null,
  blockType: WorkoutBlockType | null,
): WorkoutLine[] {
  const iid = newLocalId();
  const head: WorkoutLine = {
    localId: newLocalId(),
    row_type: "exercise",
    exercise_instance_id: iid,
    exercise_id: ex.id,
    exercise_name: ex.name,
    sort_order: 0,
    sets: null,
    reps: 10,
    duration_sec: null,
    rest_sec: 60,
    weight_kg: null,
    rpe: null,
    tempo: null,
    notes: null,
    block_id: blockId,
    block_type: blockType,
  };
  const setR: WorkoutLine = {
    localId: newLocalId(),
    row_type: "set",
    exercise_instance_id: iid,
    exercise_id: ex.id,
    exercise_name: ex.name,
    sort_order: 0,
    sets: null,
    reps: null,
    duration_sec: null,
    rest_sec: null,
    weight_kg: null,
    rpe: null,
    tempo: null,
    notes: null,
    block_id: blockId,
    block_type: blockType,
  };
  return [head, setR];
}

export function newExerciseWithOneSet(ex: { id: number; name: string }): WorkoutLine[] {
  return newExerciseWithOneSetInBlock(ex, null, null);
}

function effectiveTemplateFromRow(items: WorkoutLine[], index: number) {
  const headI = exerciseHeadIndex(items, index);
  const head = items[headI];
  const row = items[index];
  if (!head || !row) {
    return {
      reps: 10 as number | null,
      duration_sec: null as number | null,
      rest_sec: 60 as number | null,
      weight_kg: null as number | null,
      rpe: null as number | null,
      tempo: null as string | null,
      notes: null as string | null,
    };
  }
  if (row.row_type === "set") {
    return {
      reps: row.reps ?? head.reps,
      duration_sec: row.duration_sec ?? head.duration_sec,
      rest_sec: row.rest_sec ?? head.rest_sec,
      weight_kg: row.weight_kg ?? head.weight_kg,
      rpe: row.rpe ?? head.rpe,
      tempo: row.tempo ?? head.tempo,
      notes: row.notes ?? head.notes,
    };
  }
  return {
    reps: head.reps,
    duration_sec: head.duration_sec,
    rest_sec: head.rest_sec,
    weight_kg: head.weight_kg,
    rpe: head.rpe,
    tempo: head.tempo,
    notes: head.notes,
  };
}

export function endOfExerciseBundleIndex(items: WorkoutLine[], index: number): number {
  const [, hi] = exerciseGroupRange(items, index);
  return hi;
}

export function insertLinkedExerciseAfter(
  items: WorkoutLine[],
  afterIndex: number,
  ex: { id: number; name: string },
): WorkoutLine[] {
  const row = items[afterIndex];
  if (!row?.block_id) return items;
  const bid = row.block_id;
  const bt = row.block_type ?? "superset";
  const end = endOfExerciseBundleIndex(items, afterIndex);
  const tmpl = effectiveTemplateFromRow(items, afterIndex);
  const iid = newLocalId();
  const head: WorkoutLine = {
    localId: newLocalId(),
    row_type: "exercise",
    exercise_instance_id: iid,
    exercise_id: ex.id,
    exercise_name: ex.name,
    sort_order: 0,
    sets: null,
    reps: tmpl.reps,
    duration_sec: tmpl.duration_sec,
    rest_sec: tmpl.rest_sec,
    weight_kg: tmpl.weight_kg,
    rpe: tmpl.rpe,
    tempo: tmpl.tempo,
    notes: tmpl.notes,
    block_id: bid,
    block_type: bt,
  };
  const setR: WorkoutLine = {
    localId: newLocalId(),
    row_type: "set",
    exercise_instance_id: iid,
    exercise_id: ex.id,
    exercise_name: ex.name,
    sort_order: 0,
    sets: null,
    reps: null,
    duration_sec: null,
    rest_sec: null,
    weight_kg: null,
    rpe: null,
    tempo: null,
    notes: null,
    block_id: bid,
    block_type: bt,
  };
  const next = [...items.slice(0, end + 1), head, setR, ...items.slice(end + 1)];
  return next.map((r, i) => ({ ...r, sort_order: i }));
}

export function insertSetBelowGroupEnd(items: WorkoutLine[], groupEndIndex: number): WorkoutLine[] {
  const [lo, hi] = exerciseGroupRange(items, groupEndIndex);
  const head = items[lo];
  if (!head) return items;
  if (head.row_type === "legacy_line") {
    const tail = items[hi];
    const dup: WorkoutLine = {
      ...tail,
      localId: newLocalId(),
      sort_order: 0,
    };
    const next = [...items.slice(0, hi + 1), dup, ...items.slice(hi + 1)];
    return next.map((r, i) => ({ ...r, sort_order: i }));
  }
  if (!head.exercise_instance_id) return items;
  const newSet: WorkoutLine = {
    localId: newLocalId(),
    row_type: "set",
    exercise_instance_id: head.exercise_instance_id,
    exercise_id: head.exercise_id,
    exercise_name: head.exercise_name,
    sort_order: 0,
    sets: null,
    reps: null,
    duration_sec: null,
    rest_sec: null,
    weight_kg: null,
    rpe: null,
    tempo: null,
    notes: null,
    block_id: head.block_id,
    block_type: head.block_type,
  };
  const next = [...items.slice(0, hi + 1), newSet, ...items.slice(hi + 1)];
  return next.map((r, i) => ({ ...r, sort_order: i }));
}

export function mergeExerciseBundleAfterTarget(
  items: WorkoutLine[],
  activeLocalId: string,
  targetLocalId: string,
  newBlockType: WorkoutBlockType,
): WorkoutLine[] {
  const aIdx = items.findIndex((r) => r.localId === activeLocalId);
  const [aLo, aHi] = exerciseGroupRange(items, aIdx);
  if (aIdx !== aLo) return items;

  const chunk = items.slice(aLo, aHi + 1).map((r) => ({ ...r }));
  const idSet = new Set(chunk.map((c) => c.localId));
  let rest = items.filter((r) => !idSet.has(r.localId)).map((r) => ({ ...r }));

  for (const c of chunk) {
    c.block_id = null;
    c.block_type = null;
  }
  rest = stripOrphanWorkoutBlocks(rest);

  const targetIndex = rest.findIndex((r) => r.localId === targetLocalId);
  if (targetIndex < 0) return items;

  const [tLo, tHi] = exerciseGroupRange(rest, targetIndex);
  const targetHead = rest[tLo];
  if (!targetHead) return items;
  const existingBid = targetHead.block_id?.trim() || null;
  /** After the whole target exercise (head + all its sets), never after the head only — that breaks exercise/set grouping. */
  const insertAt = tHi + 1;

  if (existingBid) {
    const bt = (targetHead.block_type ?? "superset") as WorkoutBlockType;
    chunk.forEach((c) => {
      c.block_id = existingBid;
      c.block_type = bt;
    });
    rest.splice(insertAt, 0, ...chunk);
  } else {
    const bid = newLocalId();
    for (let j = tLo; j <= tHi; j++) {
      rest[j] = { ...rest[j], block_id: bid, block_type: newBlockType };
    }
    chunk.forEach((c) => {
      c.block_id = bid;
      c.block_type = newBlockType;
    });
    rest.splice(insertAt, 0, ...chunk);
  }

  return rest.map((r, i) => ({ ...r, sort_order: i }));
}

export function setRowUISegment(
  items: WorkoutLine[],
  setRowIndex: number,
): "single" | "runFirst" | "runMiddle" | "runLast" {
  const [lo, hi] = exerciseGroupRange(items, setRowIndex);
  const setIndices: number[] = [];
  for (let j = lo; j <= hi; j++) {
    if (items[j].row_type === "set") setIndices.push(j);
  }
  if (setIndices.length <= 1) return "single";
  const pos = setIndices.indexOf(setRowIndex);
  if (pos <= 0) return "runFirst";
  if (pos === setIndices.length - 1) return "runLast";
  return "runMiddle";
}

export function stripOrphanWorkoutBlocks(items: WorkoutLine[]): WorkoutLine[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.block_id) counts.set(it.block_id, (counts.get(it.block_id) ?? 0) + 1);
  }
  return items.map((it) => {
    if (it.block_id && (counts.get(it.block_id) ?? 0) < 2) {
      return { ...it, block_id: null, block_type: null };
    }
    return it;
  });
}

/** Remove block_id when fewer than two exercise bundles share that block (e.g. abandoned “add superset” after first pick). */
export function stripBlocksWithFewerThanTwoExercises(items: WorkoutLine[]): WorkoutLine[] {
  const bundlesPerBlock = new Map<string, number>();
  let i = 0;
  while (i < items.length) {
    const [lo, hi] = exerciseGroupRange(items, i);
    const head = items[lo];
    const bid = head?.block_id?.trim() || null;
    if (bid) {
      bundlesPerBlock.set(bid, (bundlesPerBlock.get(bid) ?? 0) + 1);
    }
    i = hi + 1;
  }
  return items.map((r) => {
    const bid = r.block_id?.trim() || null;
    if (bid && (bundlesPerBlock.get(bid) ?? 0) < 2) {
      return { ...r, block_id: null, block_type: null };
    }
    return r;
  });
}

/** True for `set` rows and non-first legacy lines in a run (not a bundle “head”). */
export function isWorkoutLineSetLikeRow(items: WorkoutLine[], index: number): boolean {
  const row = items[index];
  if (!row) return false;
  if (row.row_type === "set") return true;
  if (row.row_type === "legacy_line") {
    const [lo] = contiguousLegacyExerciseRun(items, index);
    return index !== lo;
  }
  return false;
}

/** First row of an exercise+sets bundle or the first row of a legacy run. */
export function isBundleHeadRow(items: WorkoutLine[], index: number): boolean {
  const row = items[index];
  if (!row) return false;
  if (row.row_type === "exercise") {
    const [lo] = exerciseGroupRange(items, index);
    return lo === index;
  }
  if (row.row_type === "legacy_line") {
    const [lo] = contiguousLegacyExerciseRun(items, index);
    return lo === index;
  }
  return false;
}

/**
 * Same rules as backend `validate_training_plan_items_sequence` (training plan / workout JSON).
 * Returns `null` if the list order is valid for exercise → set grouping.
 */
export function validateWorkoutLinesSequence(items: WorkoutLine[]): string | null {
  let pending: { eid: number; iid: string; bid: string | null } | null = null;
  let setsInGroup = 0;

  for (const row of items) {
    const rt = row.row_type;
    if (rt === "legacy_line") {
      if (pending !== null && setsInGroup === 0) {
        return "Each exercise head must be followed by at least one set row";
      }
      pending = null;
      setsInGroup = 0;
      continue;
    }

    if (rt === "exercise") {
      if (pending !== null && setsInGroup === 0) {
        return "Each exercise head must be followed by at least one set row";
      }
      const bid = row.block_id?.trim() ? row.block_id.trim() : null;
      pending = {
        eid: row.exercise_id,
        iid: row.exercise_instance_id?.trim() ? row.exercise_instance_id.trim() : "",
        bid,
      };
      setsInGroup = 0;
      continue;
    }

    if (rt === "set") {
      if (pending === null) {
        return "Set rows must immediately follow their exercise head (same sort order group)";
      }
      const { eid, iid, bid } = pending;
      const riid = row.exercise_instance_id?.trim() ? row.exercise_instance_id.trim() : "";
      if (riid !== iid) {
        return "Set row exercise_instance_id does not match its exercise head";
      }
      if (row.exercise_id !== eid) {
        return "Set row exercise_id does not match its exercise head";
      }
      const sb = row.block_id?.trim() ? row.block_id.trim() : null;
      if (sb !== bid) {
        return "Set row block_id must match its exercise head";
      }
      setsInGroup += 1;
      continue;
    }

    return `Unknown row_type: ${rt}`;
  }

  if (pending !== null && setsInGroup === 0) {
    return "Each exercise head must be followed by at least one set row";
  }
  return null;
}

export function normalizeWorkoutLinesForApi(items: WorkoutLine[]) {
  const stripped = stripOrphanWorkoutBlocks(items);
  return stripped.map((it, index) => ({
    exercise_id: it.exercise_id,
    sort_order: index,
    sets: it.sets ?? null,
    reps: it.reps ?? null,
    duration_sec: it.duration_sec ?? null,
    rest_sec: it.rest_sec ?? null,
    weight_kg: it.weight_kg ?? null,
    rpe: it.rpe ?? null,
    tempo: it.tempo?.trim() ? it.tempo.trim() : null,
    notes: it.notes?.trim() ? it.notes.trim() : null,
    block_id: it.block_id?.trim() ? it.block_id.trim() : null,
    block_type: it.block_id?.trim() ? it.block_type ?? "superset" : null,
    row_type: it.row_type,
    exercise_instance_id: it.exercise_instance_id?.trim() ? it.exercise_instance_id.trim() : null,
  }));
}

export function workoutLinesFromApiItems(
  raw: Array<{
    exercise_id: number;
    sort_order: number;
    sets?: number | null;
    reps?: number | null;
    duration_sec?: number | null;
    rest_sec?: number | null;
    weight_kg?: number | null;
    rpe?: number | null;
    tempo?: string | null;
    notes?: string | null;
    block_id?: string | null;
    block_type?: string | null;
    block_sequence?: number | null;
    row_type?: string | null;
    exercise_instance_id?: string | null;
    exercise?: { name?: string };
    exercise_name?: string | null;
  }>,
): WorkoutLine[] {
  const mapped = [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const rt = (row.row_type as WorkoutRowType | undefined) ?? "legacy_line";
      const rowType: WorkoutRowType =
        rt === "exercise" || rt === "set" || rt === "legacy_line" ? rt : "legacy_line";
      const iid = row.exercise_instance_id?.trim() || null;
      return {
        localId: newLocalId(),
        exercise_id: row.exercise_id,
        sort_order: row.sort_order,
        sets: row.sets ?? null,
        reps: row.reps ?? null,
        duration_sec: row.duration_sec ?? null,
        rest_sec: row.rest_sec ?? null,
        weight_kg: row.weight_kg ?? null,
        rpe: row.rpe ?? null,
        tempo: row.tempo ?? null,
        notes: row.notes ?? null,
        exercise_name: row.exercise?.name ?? row.exercise_name ?? undefined,
        block_id: row.block_id?.trim() ? row.block_id.trim() : null,
        block_type: (row.block_type as WorkoutBlockType) || null,
        block_sequence:
          row.block_sequence != null && !Number.isNaN(Number(row.block_sequence))
            ? Number(row.block_sequence)
            : undefined,
        row_type: rowType,
        exercise_instance_id: rowType === "legacy_line" ? null : iid,
      } satisfies WorkoutLine;
    });
  const hasModern = mapped.some((r) => r.row_type === "exercise" || r.row_type === "set");
  if (hasModern) {
    return mapped.map((r, idx) => ({ ...r, sort_order: idx }));
  }
  return consolidateLegacyPlanRows(mapped);
}

/**
 * When dropping onto a non-head row of another exercise, map the over index to a bundle
 * boundary so we never splice a multi-set exercise in the middle of another exercise.
 */
export function normalizeBundleDropOverIndex(items: WorkoutLine[], activeIndex: number, overIndex: number): number {
  const [aLo, aHi] = exerciseGroupRange(items, activeIndex);
  const [tLo, tHi] = exerciseGroupRange(items, overIndex);
  if (aLo === tLo && aHi === tHi) return overIndex;
  if (overIndex <= tLo || overIndex > tHi) return overIndex;
  if (aLo > tHi) {
    return tLo;
  }
  if (aHi < tLo) {
    return tHi + 1;
  }
  return tLo;
}

function arrayMoveIds(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids.slice();
  const next = ids.slice();
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/**
 * Matches @dnd-kit/sortable `arrayMove` on `orderedExerciseHeadLocalIds`: moves the dragged
 * exercise bundle (head + sets) to the sort position of `overHeadLocalId`. Fixes downward
 * drags where index-based splicing used to insert before the target bundle instead of after.
 */
export function reorderWorkoutLinesByHeadMove(
  items: WorkoutLine[],
  activeHeadLocalId: string,
  overHeadLocalId: string,
): WorkoutLine[] {
  if (activeHeadLocalId === overHeadLocalId) return items;
  const headIds = orderedExerciseHeadLocalIds(items);
  const oldH = headIds.indexOf(activeHeadLocalId);
  const newH = headIds.indexOf(overHeadLocalId);
  if (oldH < 0 || newH < 0) return items;

  const bundleByHeadId = new Map<string, WorkoutLine[]>();
  for (const hid of headIds) {
    const idx = items.findIndex((r) => r.localId === hid);
    if (idx < 0) continue;
    const [lo, hi] = exerciseGroupRange(items, idx);
    bundleByHeadId.set(hid, items.slice(lo, hi + 1));
  }

  const nextHeadIds = arrayMoveIds(headIds, oldH, newH);
  const out: WorkoutLine[] = [];
  for (const hid of nextHeadIds) {
    const chunk = bundleByHeadId.get(hid);
    if (chunk) out.push(...chunk);
  }
  if (out.length !== items.length) return items;
  return out.map((row, i) => ({ ...row, sort_order: i }));
}

export function reorderExerciseBundleInList(
  items: WorkoutLine[],
  activeIndex: number,
  overIndex: number,
): WorkoutLine[] {
  const activeHead = items[activeIndex]?.localId;
  const overHead = items[overIndex]?.localId;
  if (!activeHead || !overHead) return items;
  return reorderWorkoutLinesByHeadMove(items, activeHead, overHead);
}
