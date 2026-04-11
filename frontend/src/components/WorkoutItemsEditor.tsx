import { DeleteOutlined, HolderOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useInvalidate } from "@refinedev/core";
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Input,
  InputNumber,
  Divider,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../lib/api";

export type WorkoutBlockType = "superset" | "circuit" | "tri_set" | "giant_set" | "dropset";

export type WorkoutLine = {
  localId: string;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
  exercise_name?: string;
  block_id: string | null;
  block_type: WorkoutBlockType | null;
  /** From API: 0-based index inside the block (optional; server also recomputes on save). */
  block_sequence?: number | null;
};

type ExerciseOpt = { id: number; name: string; source: "catalog" | "mine" };

function newLocalId() {
  return crypto.randomUUID();
}

/** 1-based index of this row within consecutive rows with the same exercise and block (each row = one set). */
function setIndexInExerciseRun(items: WorkoutLine[], index: number): number {
  const row = items[index];
  if (!row) return 1;
  let n = 1;
  const bid = row.block_id ?? null;
  for (let j = index - 1; j >= 0; j--) {
    const p = items[j];
    if (!p) break;
    const pb = p.block_id ?? null;
    if (p.exercise_id === row.exercise_id && pb === bid) n += 1;
    else break;
  }
  return n;
}

/** Inclusive index range of consecutive rows with the same exercise and block (one “set run”). */
function contiguousSameExerciseRun(items: WorkoutLine[], index: number): [number, number] {
  const row = items[index];
  if (!row) return [index, index];
  const eid = row.exercise_id;
  const bid = row.block_id ?? null;
  let lo = index;
  while (lo > 0) {
    const p = items[lo - 1];
    if (p.exercise_id === eid && (p.block_id ?? null) === bid) lo -= 1;
    else break;
  }
  let hi = index;
  while (hi < items.length - 1) {
    const n = items[hi + 1];
    if (n.exercise_id === eid && (n.block_id ?? null) === bid) hi += 1;
    else break;
  }
  return [lo, hi];
}

/** Position within consecutive rows for the same exercise + block (for grouped set UI). */
function exerciseSetRunSegment(
  items: WorkoutLine[],
  index: number,
): "single" | "runFirst" | "runMiddle" | "runLast" {
  const [lo, hi] = contiguousSameExerciseRun(items, index);
  if (lo === hi) return "single";
  if (index === lo) return "runFirst";
  if (index === hi) return "runLast";
  return "runMiddle";
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr.slice();
  const next = arr.slice();
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function insertDuplicateSetBelow(items: WorkoutLine[], index: number): WorkoutLine[] {
  const row = items[index];
  if (!row) return items;
  const dup: WorkoutLine = {
    ...row,
    localId: newLocalId(),
    sort_order: 0,
  };
  const next = [...items.slice(0, index + 1), dup, ...items.slice(index + 1)];
  return next.map((r, i) => ({ ...r, sort_order: i }));
}

function contiguousBlockRange(items: WorkoutLine[], index: number): [number, number] {
  const bid = items[index]?.block_id;
  if (!bid) return [index, index];
  let lo = index;
  while (lo > 0 && items[lo - 1]?.block_id === bid) lo--;
  let hi = index;
  while (hi < items.length - 1 && items[hi + 1]?.block_id === bid) hi++;
  return [lo, hi];
}

export function reorderWithBlocks(items: WorkoutLine[], activeIndex: number, overIndex: number): WorkoutLine[] {
  if (activeIndex === overIndex) return items;
  const [lo, hi] = contiguousBlockRange(items, activeIndex);
  if (overIndex >= lo && overIndex <= hi) return items;
  const chunk = items.slice(lo, hi + 1);
  const rest = [...items.slice(0, lo), ...items.slice(hi + 1)];
  let insertBefore = overIndex;
  if (overIndex > hi) insertBefore = overIndex - chunk.length;
  else if (overIndex < lo) insertBefore = overIndex;
  insertBefore = Math.max(0, Math.min(insertBefore, rest.length));
  return [...rest.slice(0, insertBefore), ...chunk, ...rest.slice(insertBefore)].map((row, i) => ({
    ...row,
    sort_order: i,
  }));
}

function stripOrphanBlocks(items: WorkoutLine[]): WorkoutLine[] {
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

/** Droppable id prefix: merge dragged row immediately after the row that owns this zone. */
const LINK_AFTER_PREFIX = "link-after:";

function linkAfterDroppableId(localId: string) {
  return `${LINK_AFTER_PREFIX}${localId}`;
}

const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 14,
  padding: "12px 12px 10px",
  borderRadius: 14,
  border: "1px solid color-mix(in srgb, var(--ant-color-primary) 14%, var(--app-border, rgba(148, 163, 184, 0.2)))",
  background: "color-mix(in srgb, var(--ant-color-primary) 4%, var(--app-surface, rgba(18, 24, 38, 0.5)))",
  boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--ant-color-primary) 8%, transparent)",
};

const exerciseGroupInBlockShellStyle: CSSProperties = {
  marginBottom: 10,
  padding: "10px 10px 8px",
  borderRadius: 12,
  border: "1px solid var(--app-border, rgba(148, 163, 184, 0.18))",
  background: "color-mix(in srgb, var(--app-surface-elevated, #1a2234) 88%, transparent)",
};

function AddSetBelowFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      style={{
        marginTop: 4,
        paddingTop: 10,
        borderTop: "1px dashed color-mix(in srgb, var(--ant-color-primary) 20%, var(--app-border, rgba(148,163,184,0.25)))",
      }}
    >
      <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}

/** Move active row to sit right after target, then share target's block or create a new pair. */
function mergeDraggedAfterTarget(
  items: WorkoutLine[],
  activeLocalId: string,
  targetLocalId: string,
  newBlockType: WorkoutBlockType,
): WorkoutLine[] {
  let activeIndex = items.findIndex((r) => r.localId === activeLocalId);
  let targetIndex = items.findIndex((r) => r.localId === targetLocalId);
  if (activeIndex < 0 || targetIndex < 0 || activeLocalId === targetLocalId) return items;

  const [alo, ahi] = contiguousBlockRange(items, activeIndex);
  if (alo !== ahi) return items;

  let rows = items.map((r) => ({ ...r }));
  rows[activeIndex] = { ...rows[activeIndex], block_id: null, block_type: null };
  rows = stripOrphanBlocks(rows);

  activeIndex = rows.findIndex((r) => r.localId === activeLocalId);
  targetIndex = rows.findIndex((r) => r.localId === targetLocalId);
  if (activeIndex < 0 || targetIndex < 0) return items;

  const [removed] = rows.splice(activeIndex, 1);
  if (activeIndex < targetIndex) targetIndex -= 1;

  const target = rows[targetIndex];
  const existingBid = target.block_id?.trim() || null;

  if (existingBid) {
    const bt = (target.block_type ?? "superset") as WorkoutBlockType;
    rows.splice(targetIndex + 1, 0, { ...removed, block_id: existingBid, block_type: bt });
  } else {
    const bid = newLocalId();
    rows[targetIndex] = { ...target, block_id: bid, block_type: newBlockType };
    rows.splice(targetIndex + 1, 0, { ...removed, block_id: bid, block_type: newBlockType });
  }

  return rows.map((r, i) => ({ ...r, sort_order: i }));
}

/** Stabilize grouping: when several “link after” zones overlap the drag rect, pick the nearest to the dragged item center. */
function pickNearestLinkCollision(
  args: Parameters<CollisionDetection>[0],
  linkCollisions: ReturnType<CollisionDetection>,
): ReturnType<CollisionDetection> {
  if (linkCollisions.length <= 1) return linkCollisions;
  const cr = args.collisionRect;
  const acx = cr.left + cr.width / 2;
  const acy = cr.top + cr.height / 2;
  let best = linkCollisions[0];
  let bestD = Infinity;
  for (const hit of linkCollisions) {
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

function workoutLinkCollisionDetection(args: Parameters<CollisionDetection>[0]) {
  const linkContainers = args.droppableContainers.filter((c) => String(c.id).startsWith(LINK_AFTER_PREFIX));
  if (linkContainers.length === 0) {
    return closestCorners(args);
  }
  const linkArgs = { ...args, droppableContainers: linkContainers };

  const pointerLink = pointerWithin(linkArgs);
  if (pointerLink.length > 0) {
    return pickNearestLinkCollision(args, pointerLink);
  }

  const rectLink = rectIntersection(linkArgs);
  if (rectLink.length > 0) {
    return pickNearestLinkCollision(args, rectLink);
  }

  return closestCorners(args);
}

function blockAccent(blockId: string): string {
  let h = 0;
  for (let i = 0; i < blockId.length; i++) h = (h * 31 + blockId.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 52%)`;
}

export function normalizeWorkoutItemsForApi(items: WorkoutLine[]) {
  const stripped = stripOrphanBlocks(items);
  return stripped.map((it, index) => ({
    exercise_id: it.exercise_id,
    sort_order: index,
    sets: it.sets ?? null,
    reps: it.reps ?? null,
    duration_sec: it.duration_sec ?? null,
    rest_sec: it.rest_sec ?? null,
    notes: it.notes?.trim() ? it.notes.trim() : null,
    block_id: it.block_id?.trim() ? it.block_id.trim() : null,
    block_type: it.block_id?.trim() ? it.block_type ?? "superset" : null,
  }));
}

async function loadExercisesGrouped(
  venueCompat: string | null | undefined,
): Promise<{ catalog: ExerciseOpt[]; mine: ExerciseOpt[] }> {
  const sp = new URLSearchParams({ limit: "200", offset: "0" });
  if (venueCompat === "home" || venueCompat === "commercial_gym") {
    sp.set("venue_compat", venueCompat);
  }
  const h = authHeaders();
  const [a, b] = await Promise.all([
    fetch(`${apiPrefix}/directory/exercises?${sp}`, { headers: h }),
    fetch(`${apiPrefix}/exercises?${sp}`, { headers: h }),
  ]);
  const aj = (await a.json()) as { items?: Array<{ id: number; name: string }> };
  const bj = (await b.json()) as { items?: Array<{ id: number; name: string }> };
  const catalog = (aj.items ?? [])
    .map((x) => ({ id: x.id, name: x.name, source: "catalog" as const }))
    .sort((u, v) => u.name.localeCompare(v.name));
  const mine = (bj.items ?? [])
    .map((x) => ({ id: x.id, name: x.name, source: "mine" as const }))
    .sort((u, v) => u.name.localeCompare(v.name));
  return { catalog, mine };
}

export type WorkoutItemsEditorProps = {
  mode: "training-plan" | "client";
  planId?: number;
  planVenue?: string | null;
  initialItems: WorkoutLine[];
  showSaveButton?: boolean;
  onChange?: (items: WorkoutLine[]) => void;
};

const BLOCK_OPTIONS: { value: WorkoutBlockType; labelKey: string }[] = [
  { value: "superset", labelKey: "workouts.block.superset" },
  { value: "circuit", labelKey: "workouts.block.circuit" },
  { value: "tri_set", labelKey: "workouts.block.tri_set" },
  { value: "giant_set", labelKey: "workouts.block.giant_set" },
  { value: "dropset", labelKey: "workouts.block.dropset" },
];

type PickerContext = { mode: "append" } | { mode: "extendBlock"; afterIndex: number };

function insertLinkedChildAfter(items: WorkoutLine[], afterIndex: number, ex: ExerciseOpt): WorkoutLine[] {
  const row = items[afterIndex];
  if (!row?.block_id) return items;
  const bid = row.block_id;
  const bt = row.block_type ?? "superset";
  const child: WorkoutLine = {
    localId: newLocalId(),
    exercise_id: ex.id,
    exercise_name: ex.name,
    sort_order: 0,
            sets: 1,
            reps: row.reps,
    duration_sec: row.duration_sec,
    rest_sec: row.rest_sec,
    notes: null,
    block_id: bid,
    block_type: bt,
  };
  const next = [...items.slice(0, afterIndex + 1), child, ...items.slice(afterIndex + 1)];
  return next.map((r, i) => ({ ...r, sort_order: i }));
}

function SortableRow({
  row,
  index,
  insideBlock,
  packInExerciseGroup,
  blockStepLabel,
  setLabel,
  setRunSegment,
  canExtendLink,
  onPickExtendBlock,
  mergeDropEnabled,
  t,
  updateAt,
  removeAt,
}: {
  row: WorkoutLine;
  index: number;
  insideBlock: boolean;
  /** Row sits inside the per-exercise shell; outer vertical gaps come from the shell + footer. */
  packInExerciseGroup: boolean;
  blockStepLabel: string | null;
  setLabel: string;
  /** Where this row sits in a same-exercise set run (drives spacing + nested look for extra sets). */
  setRunSegment: "single" | "runFirst" | "runMiddle" | "runLast";
  canExtendLink: boolean;
  onPickExtendBlock: () => void;
  /** Show dashed drop zone to group dragged exercise after this row (superset / dropset / …). */
  mergeDropEnabled: boolean;
  t: (k: string) => string;
  updateAt: (i: number, patch: Partial<WorkoutLine>) => void;
  removeAt: (i: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.localId,
  });
  const isExtraSetRow = setRunSegment === "runMiddle" || setRunSegment === "runLast";
  const showMergeDrop = mergeDropEnabled && !isExtraSetRow;
  const mergeDropId = linkAfterDroppableId(row.localId);
  const { setNodeRef: setMergeDropRef, isOver: mergeDropOver } = useDroppable({
    id: mergeDropId,
    disabled: !showMergeDrop,
  });
  const rowStripe =
    insideBlock || !row.block_id
      ? "4px solid transparent"
      : `4px solid ${blockAccent(row.block_id)}`;

  const setRail = "3px solid color-mix(in srgb, var(--ant-color-primary) 55%, transparent)";
  const nestedBg = "color-mix(in srgb, var(--ant-color-primary) 8%, var(--app-surface, #141a28))";
  const nestedBorder = "1px solid color-mix(in srgb, var(--ant-color-primary) 22%, var(--app-border, rgba(148,163,184,0.2)))";

  let borderRadius: string | number = 8;
  let marginTop = 0;
  let marginBottom = insideBlock ? 0 : 8;
  let paddingTop = 12;
  let paddingBottom = 12;
  let background = "var(--app-surface-elevated, #1a2234)";
  let border = "1px solid var(--app-border, rgba(148,163,184,0.16))";
  let extraPaddingLeft = 0;

  if (setRunSegment === "runFirst") {
    borderRadius = "12px 12px 6px 6px";
    marginBottom = insideBlock ? 6 : 6;
    paddingBottom = 10;
  } else if (setRunSegment === "runMiddle") {
    marginTop = insideBlock ? 6 : 10;
    marginBottom = 4;
    paddingTop = 10;
    paddingBottom = 10;
    borderRadius = 8;
    background = nestedBg;
    border = nestedBorder;
    extraPaddingLeft = 12;
  } else if (setRunSegment === "runLast") {
    marginTop = insideBlock ? 6 : 10;
    marginBottom = insideBlock ? 0 : 14;
    paddingTop = 10;
    paddingBottom = 12;
    borderRadius = "8px 8px 12px 12px";
    background = nestedBg;
    border = nestedBorder;
    extraPaddingLeft = 12;
  }

  if (packInExerciseGroup) {
    if (setRunSegment === "single" || setRunSegment === "runLast") {
      marginBottom = 0;
    }
    if (setRunSegment === "single") {
      marginTop = 0;
    }
  }

  if (isExtraSetRow) {
    paddingTop = Math.min(paddingTop, 10);
    paddingBottom = Math.min(paddingBottom, 10);
  }

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    borderLeft: isExtraSetRow ? setRail : rowStripe,
    paddingLeft: 10 + extraPaddingLeft,
    paddingRight: 8,
    paddingTop,
    paddingBottom,
    marginTop,
    marginBottom,
    background,
    border,
    borderRadius,
    boxShadow:
      setRunSegment === "runMiddle" || setRunSegment === "runLast"
        ? "inset 0 1px 0 color-mix(in srgb, var(--ant-color-primary) 12%, transparent)"
        : undefined,
  };

  const labelTiny: CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 6,
    opacity: 0.85,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {setRunSegment === "runFirst" ? (
        <Typography.Text
          type="secondary"
          style={{
            display: "block",
            fontSize: 11,
            fontStyle: "italic",
            marginBottom: 10,
            paddingLeft: 36,
            opacity: 0.9,
          }}
        >
          {t("workouts.setsGroupedSubtitle")}
        </Typography.Text>
      ) : null}
      <Space wrap align="start" style={{ width: "100%" }} size={[8, 8]}>
        <Button type="text" size="small" icon={<HolderOutlined />} {...attributes} {...listeners} />
        <div style={{ minWidth: 120 }}>
          <Typography.Text type="secondary" style={labelTiny}>
            {t("workouts.colBlock")}
          </Typography.Text>
          {blockStepLabel ? (
            <Typography.Text strong style={{ fontSize: 12, display: "block", lineHeight: 1.35 }}>
              {blockStepLabel}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("workouts.block.single")}
            </Typography.Text>
          )}
        </div>
        <Flex
          align="flex-start"
          gap={14}
          style={{
            flex: "1 1 260px",
            minWidth: 200,
            paddingTop: 2,
            borderLeft: isExtraSetRow ? "1px dashed color-mix(in srgb, var(--ant-color-primary) 35%, transparent)" : undefined,
            paddingLeft: isExtraSetRow ? 12 : 0,
            marginLeft: isExtraSetRow ? 4 : 0,
          }}
        >
          <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
            <Typography.Text type="secondary" style={{ ...labelTiny, marginBottom: 8 }}>
              {t("workouts.colSet")}
            </Typography.Text>
            <Tag
              color={isExtraSetRow ? "default" : "processing"}
              style={{
                margin: 0,
                minWidth: 36,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                lineHeight: "22px",
                padding: "0 10px",
                borderRadius: 8,
              }}
            >
              {setLabel}
            </Tag>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 0 }}>
            {!isExtraSetRow ? (
              <>
                <Typography.Text type="secondary" style={labelTiny}>
                  {t("workouts.colExercise")}
                </Typography.Text>
                <Typography.Text
                  strong
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    display: "block",
                  }}
                  ellipsis={{ tooltip: row.exercise_name ?? `ID ${row.exercise_id}` }}
                >
                  {row.exercise_name ?? `ID ${row.exercise_id}`}
                </Typography.Text>
              </>
            ) : (
              <>
                <Typography.Text type="secondary" style={{ ...labelTiny, marginBottom: 4 }}>
                  {t("workouts.extraSetExerciseLabel")}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 13, lineHeight: 1.4, display: "block" }}
                  ellipsis={{ tooltip: row.exercise_name ?? `ID ${row.exercise_id}` }}
                >
                  {row.exercise_name ?? `ID ${row.exercise_id}`}
                </Typography.Text>
              </>
            )}
          </div>
        </Flex>
        <InputNumber
          min={0}
          size="small"
          style={{ width: 72 }}
          placeholder={t("workouts.colReps")}
          value={row.reps ?? undefined}
          onChange={(v) => updateAt(index, { reps: v == null ? null : Number(v) })}
        />
        <InputNumber
          min={0}
          size="small"
          style={{ width: 80 }}
          placeholder={t("workouts.colDurationSec")}
          value={row.duration_sec ?? undefined}
          onChange={(v) => updateAt(index, { duration_sec: v == null ? null : Number(v) })}
        />
        <InputNumber
          min={0}
          size="small"
          style={{ width: 80 }}
          placeholder={t("workouts.colRestSec")}
          value={row.rest_sec ?? undefined}
          onChange={(v) => updateAt(index, { rest_sec: v == null ? null : Number(v) })}
        />
        <Input
          size="small"
          style={{ flex: "2 1 180px", minWidth: 140 }}
          placeholder={t("workouts.colTipsNotes")}
          value={row.notes ?? ""}
          onChange={(e) => updateAt(index, { notes: e.target.value || null })}
        />
        <Space size={4} wrap>
          {!isExtraSetRow && canExtendLink ? (
            <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={onPickExtendBlock}>
              {t("workouts.addLinkedBelow")}
            </Button>
          ) : null}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAt(index)} />
        </Space>
      </Space>
      <div
        ref={setMergeDropRef}
        role="presentation"
        style={
          showMergeDrop
            ? {
                marginTop: 8,
                minHeight: 40,
                borderRadius: 8,
                border: `1px dashed ${
                  mergeDropOver ? "var(--ant-color-primary)" : "var(--app-border, rgba(148,163,184,0.4))"
                }`,
                background: mergeDropOver ? "var(--ant-color-primary-bg)" : "rgba(148,163,184,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "var(--ant-color-text-tertiary)",
                padding: "10px 12px",
                textAlign: "center",
                boxSizing: "border-box",
              }
            : { display: "none" }
        }
      >
        {showMergeDrop ? t("workouts.mergeDropHint") : null}
      </div>
    </div>
  );
}

export function WorkoutItemsEditor({
  mode,
  planId,
  planVenue,
  initialItems,
  showSaveButton = true,
  onChange,
}: WorkoutItemsEditorProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [items, setItems] = useState<WorkoutLine[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [catalogOpts, setCatalogOpts] = useState<ExerciseOpt[]>([]);
  const [mineOpts, setMineOpts] = useState<ExerciseOpt[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerScope, setPickerScope] = useState<"all" | "mine" | "catalog">("all");
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [mergeModal, setMergeModal] = useState<{ activeLocalId: string; targetLocalId: string } | null>(
    null,
  );
  const [mergePickType, setMergePickType] = useState<WorkoutBlockType>("superset");
  /** Add-exercise picker in a modal (opened from the button below the list or from “Add linked below”). */
  const [exercisePickerModalOpen, setExercisePickerModalOpen] = useState(false);
  const pickerContextRef = useRef<PickerContext>({ mode: "append" });
  /** Mirrors ref so the UI can show which add mode is active (append vs linking). */
  const [pickerBanner, setPickerBanner] = useState<PickerContext>({ mode: "append" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const venueCompat = useMemo(() => {
    if (planVenue === "home" || planVenue === "commercial_gym") return planVenue;
    return undefined;
  }, [planVenue]);

  const draggedRowIsSingle = useMemo(() => {
    if (!activeDragId) return false;
    const i = items.findIndex((r) => r.localId === activeDragId);
    if (i < 0) return false;
    const [lo, hi] = contiguousBlockRange(items, i);
    return lo === hi;
  }, [activeDragId, items]);

  const mergeDropActiveForRow = useCallback(
    (rowLocalId: string) =>
      Boolean(activeDragId && activeDragId !== rowLocalId && draggedRowIsSingle),
    [activeDragId, draggedRowIsSingle],
  );

  const activeDragRow = useMemo(
    () => (activeDragId ? items.find((r) => r.localId === activeDragId) : undefined),
    [activeDragId, items],
  );

  useEffect(() => {
    const next = (initialItems ?? []).map((x, i) => ({
      ...x,
      localId: x.localId || newLocalId(),
      sort_order: i,
      block_id: x.block_id ?? null,
      block_type: x.block_type ?? null,
    }));
    setItems(next);
  }, [initialItems]);

  const pushItems = useCallback(
    (next: WorkoutLine[]) => {
      setItems(next);
      onChange?.(next);
    },
    [onChange],
  );

  const loadExerciseOptions = useCallback(async () => {
    setPickerLoading(true);
    try {
      const { catalog, mine } = await loadExercisesGrouped(venueCompat ?? null);
      setCatalogOpts(catalog);
      setMineOpts(mine);
    } catch {
      message.error(t("workouts.loadExercisesError"));
    } finally {
      setPickerLoading(false);
    }
  }, [message, t, venueCompat]);

  useEffect(() => {
    if (!exercisePickerModalOpen) return;
    void loadExerciseOptions();
  }, [exercisePickerModalOpen, loadExerciseOptions]);

  const closeExercisePickerModal = useCallback(() => {
    setExercisePickerModalOpen(false);
    pickerContextRef.current = { mode: "append" };
    setPickerBanner({ mode: "append" });
  }, []);

  const armPickerContext = useCallback((ctx: PickerContext) => {
    pickerContextRef.current = ctx;
    setPickerBanner(ctx);
    setExercisePickerModalOpen(true);
  }, []);

  const pickerLists = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const match = (e: ExerciseOpt) => !q || e.name.toLowerCase().includes(q);
    let mineF = mineOpts.filter(match);
    let catF = catalogOpts.filter(match);
    if (pickerScope === "mine") catF = [];
    if (pickerScope === "catalog") mineF = [];
    return { mine: mineF, catalog: catF };
  }, [catalogOpts, mineOpts, pickerQuery, pickerScope]);

  const pickerTotal = pickerLists.mine.length + pickerLists.catalog.length;

  const addExerciseFromPicker = useCallback(
    (ex: ExerciseOpt) => {
      const ctx = pickerContextRef.current;
      let next: WorkoutLine[];
      if (ctx.mode === "extendBlock") {
        next = insertLinkedChildAfter(items, ctx.afterIndex, ex);
      } else {
        next = [
          ...items,
          {
            localId: newLocalId(),
            exercise_id: ex.id,
            sort_order: items.length,
            sets: 1,
            reps: 10,
            duration_sec: null,
            rest_sec: 60,
            notes: null,
            exercise_name: ex.name,
            block_id: null,
            block_type: null,
          },
        ];
      }
      pushItems(next);
      pickerContextRef.current = { mode: "append" };
      setPickerBanner({ mode: "append" });
    },
    [items, pushItems],
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const onDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeLocalId = String(active.id);
      setActiveDragId(null);

      if (!over) return;
      const overId = String(over.id);

      if (overId.startsWith(LINK_AFTER_PREFIX)) {
        const targetLocalId = overId.slice(LINK_AFTER_PREFIX.length);
        if (targetLocalId === activeLocalId) return;

        const ai = items.findIndex((x) => x.localId === activeLocalId);
        const ti = items.findIndex((x) => x.localId === targetLocalId);
        if (ai < 0 || ti < 0) return;

        const [alo, ahi] = contiguousBlockRange(items, ai);
        if (alo !== ahi) {
          message.warning(t("workouts.mergeNeedSingleRow"));
          return;
        }

        const targetRow = items[ti];
        if (targetRow.block_id?.trim()) {
          pushItems(mergeDraggedAfterTarget(items, activeLocalId, targetLocalId, "superset"));
        } else {
          setMergePickType("superset");
          setMergeModal({ activeLocalId, targetLocalId });
        }
        return;
      }

      if (activeLocalId === overId) return;
      const oldIndex = items.findIndex((x) => x.localId === activeLocalId);
      const newIndex = items.findIndex((x) => x.localId === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const [runLo, runHi] = contiguousSameExerciseRun(items, oldIndex);
      if (runHi > runLo) {
        if (newIndex >= runLo && newIndex <= runHi) {
          const moved = arrayMove(items, oldIndex, newIndex).map((r, i) => ({ ...r, sort_order: i }));
          pushItems(moved);
          return;
        }
        message.info(t("workouts.reorderSetsOnlyHere"));
        return;
      }

      pushItems(reorderWithBlocks(items, oldIndex, newIndex));
    },
    [items, message, pushItems, t],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = items.filter((_, i) => i !== index);
      pushItems(next.map((row, i) => ({ ...row, sort_order: i })));
    },
    [items, pushItems],
  );

  const updateAt = useCallback(
    (index: number, patch: Partial<WorkoutLine>) => {
      const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
      pushItems(next);
    },
    [items, pushItems],
  );

  const updateBlockType = useCallback(
    (blockId: string, bt: WorkoutBlockType) => {
      const next = items.map((row) => (row.block_id === blockId ? { ...row, block_type: bt } : row));
      pushItems(next);
    },
    [items, pushItems],
  );

  const addSetBelow = useCallback(
    (index: number) => {
      pushItems(insertDuplicateSetBelow(items, index));
    },
    [items, pushItems],
  );

  const saveTrainingPlan = useCallback(async () => {
    if (!planId) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiPrefix}/training-plans/${planId}/items`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(normalizeWorkoutItemsForApi(items)),
      });
      if (!res.ok) {
        message.error(await res.text());
        return;
      }
      message.success(t("workouts.itemsSaved"));
      await invalidate({ resource: "training-plans", invalidates: ["detail"], id: String(planId) });
    } catch {
      message.error(t("workouts.itemsSaveError"));
    } finally {
      setSaving(false);
    }
  }, [invalidate, items, message, planId, t]);

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t("workouts.builderTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t("workouts.builderHint")}</Typography.Paragraph>
      {planVenue === "home" || planVenue === "commercial_gym" ? (
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          {t("workouts.venueFilterHint", { venue: t(`workouts.venue.${planVenue}`) })}
        </Typography.Text>
      ) : null}

      <Space wrap style={{ marginBottom: 12 }}>
        {mode === "training-plan" && showSaveButton ? (
          <Button type="primary" onClick={() => void saveTrainingPlan()} loading={saving}>
            {t("workouts.saveItems")}
          </Button>
        ) : null}
      </Space>

      {items.length === 0 ? (
        <Typography.Text type="secondary">{t("workouts.emptyItems")}</Typography.Text>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={workoutLinkCollisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={items.map((r) => r.localId)} strategy={verticalListSortingStrategy}>
            {(() => {
              const nodes: ReactNode[] = [];
              let i = 0;
              while (i < items.length) {
                const row = items[i];
                if (!row.block_id) {
                  const [lo, hi] = contiguousSameExerciseRun(items, i);
                  nodes.push(
                    <div key={`exercise-group-${items[lo].localId}`} style={exerciseGroupShellStyle}>
                      {Array.from({ length: hi - lo + 1 }, (_, off) => {
                        const idx = lo + off;
                        const r = items[idx];
                        const setRun = setIndexInExerciseRun(items, idx);
                        return (
                          <Fragment key={r.localId}>
                            <SortableRow
                              row={r}
                              index={idx}
                              insideBlock={false}
                              packInExerciseGroup
                              blockStepLabel={null}
                              setLabel={t("workouts.setNumber", { n: setRun })}
                              setRunSegment={exerciseSetRunSegment(items, idx)}
                              canExtendLink={false}
                              onPickExtendBlock={() => armPickerContext({ mode: "extendBlock", afterIndex: idx })}
                              mergeDropEnabled={mergeDropActiveForRow(r.localId)}
                              t={t}
                              updateAt={updateAt}
                              removeAt={removeAt}
                            />
                          </Fragment>
                        );
                      })}
                      <AddSetBelowFooter onClick={() => addSetBelow(hi)} label={t("workouts.addSetBelow")} />
                    </div>,
                  );
                  i = hi + 1;
                  continue;
                }
                const bid = row.block_id!;
                const start = i;
                i += 1;
                while (i < items.length && items[i].block_id === bid) i += 1;
                const end = i - 1;
                const accent = blockAccent(bid);
                const bt = items[start].block_type ?? "superset";
                const blockLen = end - start + 1;
                nodes.push(
                  <div
                    key={bid}
                    style={{
                      marginBottom: 12,
                      padding: "12px 12px 8px",
                      borderRadius: 12,
                      border: "1px solid var(--app-border, rgba(148, 163, 184, 0.2))",
                      boxShadow: `inset 4px 0 0 0 ${accent}`,
                      background: "var(--app-surface, rgba(18, 24, 38, 0.35))",
                    }}
                  >
                    <Flex align="center" gap={10} wrap="wrap" style={{ marginBottom: 10 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t("workouts.blockGroupLabel")}
                      </Typography.Text>
                      <Select<WorkoutBlockType>
                        size="small"
                        style={{ width: 210 }}
                        value={bt}
                        options={BLOCK_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                        onChange={(v) => updateBlockType(bid, v)}
                      />
                      <Tag style={{ margin: 0 }} color="processing">
                        {t("workouts.blockMemberCount", { count: blockLen })}
                      </Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t("workouts.blockDragBundleHint")}
                      </Typography.Text>
                    </Flex>
                    {(() => {
                      const dividerStyle: CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        margin: "4px 0 8px 28px",
                        color: "var(--ant-color-text-tertiary)",
                        fontSize: 12,
                      };
                      let k = 0;
                      const blockChildren: ReactNode[] = [];
                      while (k < blockLen) {
                        const globalIndex = start + k;
                        const [lo, hi] = contiguousSameExerciseRun(items, globalIndex);
                        blockChildren.push(
                          <Fragment key={`ex-in-block-${items[lo].localId}`}>
                            {lo > start ? (
                              <div style={dividerStyle}>
                                <span aria-hidden style={{ fontWeight: 600 }}>
                                  ↳
                                </span>
                                <div
                                  style={{
                                    flex: 1,
                                    height: 1,
                                    background: "var(--app-border, rgba(148, 163, 184, 0.22))",
                                  }}
                                />
                              </div>
                            ) : null}
                            <div style={exerciseGroupInBlockShellStyle}>
                              {Array.from({ length: hi - lo + 1 }, (_, d) => {
                                const idx = lo + d;
                                const r = items[idx];
                                const stepLabel = t("workouts.blockMemberStep", {
                                  current: idx - start + 1,
                                  total: blockLen,
                                });
                                const setRun = setIndexInExerciseRun(items, idx);
                                const seg = exerciseSetRunSegment(items, idx);
                                return (
                                  <Fragment key={r.localId}>
                                    <SortableRow
                                      row={r}
                                      index={idx}
                                      insideBlock
                                      packInExerciseGroup
                                      blockStepLabel={stepLabel}
                                      setLabel={t("workouts.setNumber", { n: setRun })}
                                      setRunSegment={seg}
                                      canExtendLink
                                      onPickExtendBlock={() =>
                                        armPickerContext({ mode: "extendBlock", afterIndex: idx })
                                      }
                                      mergeDropEnabled={mergeDropActiveForRow(r.localId)}
                                      t={t}
                                      updateAt={updateAt}
                                      removeAt={removeAt}
                                    />
                                  </Fragment>
                                );
                              })}
                              <AddSetBelowFooter onClick={() => addSetBelow(hi)} label={t("workouts.addSetBelow")} />
                            </div>
                          </Fragment>,
                        );
                        k = hi - start + 1;
                      }
                      return blockChildren;
                    })()}
                  </div>,
                );
              }
              return nodes;
            })()}
          </SortableContext>
          <DragOverlay dropAnimation={null} style={{ zIndex: 1100 }}>
            {activeDragRow ? (
              <div
                style={{
                  padding: "14px 18px",
                  minWidth: 280,
                  maxWidth: 440,
                  borderRadius: 10,
                  background: "var(--app-surface-elevated, #1a2234)",
                  border: "1px solid color-mix(in srgb, var(--ant-color-primary) 45%, var(--app-border, rgba(148,163,184,0.3)))",
                  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.38)",
                  cursor: "grabbing",
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  {t("workouts.colExercise")}
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {activeDragRow.exercise_name ?? `ID ${activeDragRow.exercise_id}`}
                </Typography.Text>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!exercisePickerModalOpen && pickerBanner.mode !== "append" ? (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          message={t("workouts.pickerCollapsedLinkHint")}
          action={
            <Button size="small" type="primary" onClick={() => setExercisePickerModalOpen(true)}>
              {t("workouts.openExerciseLibrary")}
            </Button>
          }
        />
      ) : null}

      <Button
        type="dashed"
        block
        size="large"
        icon={<PlusOutlined />}
        onClick={() => armPickerContext({ mode: "append" })}
        style={{ marginTop: 16 }}
      >
        {t("workouts.addExercise")}
      </Button>

      <Modal
        title={
          <div>
            <Typography.Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {t("workouts.pickExercise")}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontWeight: 400 }}>
              {t("workouts.pickerModalSubtitle")}
            </Typography.Text>
          </div>
        }
        open={exercisePickerModalOpen}
        onCancel={closeExercisePickerModal}
        footer={
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <Button loading={pickerLoading} onClick={() => void loadExerciseOptions()}>
              {t("workouts.exerciseBankRefresh")}
            </Button>
            <Button type="primary" onClick={closeExercisePickerModal}>
              {t("workouts.pickerDone")}
            </Button>
          </Flex>
        }
        width={640}
        centered
        destroyOnClose
        styles={{
          body: {
            paddingTop: 8,
            maxHeight: "min(78vh, 640px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <div id="workout-exercise-bank">
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            {t("workouts.exerciseBankIntro")}
          </Typography.Paragraph>
          {pickerBanner.mode === "extendBlock" ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={t("workouts.pickerActiveExtendBlock")}
              action={
                <Button size="small" onClick={() => armPickerContext({ mode: "append" })}>
                  {t("workouts.pickerClearMode")}
                </Button>
              }
            />
          ) : null}
          {pickerBanner.mode === "append" ? (
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
              {t("workouts.pickerActiveAppend")}
            </Typography.Text>
          ) : null}
          {pickerLoading && catalogOpts.length === 0 && mineOpts.length === 0 ? (
            <Flex align="center" justify="center" style={{ minHeight: 160 }}>
              <Spin />
            </Flex>
          ) : (
            <Space direction="vertical" style={{ width: "100%", flex: 1, minHeight: 0 }} size="middle">
              <Flex wrap="wrap" gap={8} align="center" justify="space-between">
                <Segmented
                  value={pickerScope}
                  onChange={(v) => setPickerScope(v as "all" | "mine" | "catalog")}
                  options={[
                    { value: "all", label: t("workouts.pickerScopeAll") },
                    { value: "mine", label: t("workouts.pickerScopeMine") },
                    { value: "catalog", label: t("workouts.pickerScopeCatalog") },
                  ]}
                />
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => armPickerContext({ mode: "append" })}
                >
                  {t("workouts.addToEnd")}
                </Button>
              </Flex>
              <Input.Search
                allowClear
                placeholder={t("workouts.pickerFilterPh")}
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                enterButton={<SearchOutlined />}
              />
              <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("workouts.pickerHint")}
                </Typography.Text>
                {pickerTotal > 0 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t("workouts.pickerShowingCount", { count: pickerTotal })}
                  </Typography.Text>
                ) : null}
              </Flex>
              <div
                style={{
                  flex: 1,
                  minHeight: 200,
                  maxHeight: 380,
                  overflowY: "auto",
                  paddingInlineEnd: 4,
                }}
              >
                {pickerTotal === 0 && !pickerLoading ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("workouts.pickerNoMatches")} />
                ) : pickerTotal === 0 && pickerLoading ? (
                  <Flex justify="center" style={{ padding: 24 }}>
                    <Spin />
                  </Flex>
                ) : (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {pickerLists.mine.length > 0 ? (
                      <>
                        <Typography.Text strong style={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupMine")}
                        </Typography.Text>
                        {pickerLists.mine.map((ex) => (
                          <Flex
                            key={`mine-${ex.id}`}
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--app-border, rgba(148, 163, 184, 0.16))",
                              background: "var(--app-surface-elevated, rgba(26, 32, 52, 0.55))",
                            }}
                          >
                            <Flex align="center" gap={10} style={{ minWidth: 0, flex: "1 1 200px" }}>
                              <Typography.Text ellipsis title={ex.name} style={{ margin: 0 }}>
                                {ex.name}
                              </Typography.Text>
                              <Tag
                                style={{ margin: 0, fontSize: 11, lineHeight: "18px", flexShrink: 0 }}
                                color="green"
                              >
                                {t("workouts.pickerTagMine")}
                              </Tag>
                            </Flex>
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => addExerciseFromPicker(ex)}
                            >
                              {t("workouts.pickerAddExercise")}
                            </Button>
                          </Flex>
                        ))}
                      </>
                    ) : null}
                    {pickerLists.mine.length > 0 && pickerLists.catalog.length > 0 ? (
                      <Divider style={{ margin: "4px 0" }} />
                    ) : null}
                    {pickerLists.catalog.length > 0 ? (
                      <>
                        <Typography.Text strong style={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupCatalog")}
                        </Typography.Text>
                        {pickerLists.catalog.map((ex) => (
                          <Flex
                            key={`cat-${ex.id}`}
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--app-border, rgba(148, 163, 184, 0.16))",
                              background: "var(--app-surface-elevated, rgba(26, 32, 52, 0.55))",
                            }}
                          >
                            <Flex align="center" gap={10} style={{ minWidth: 0, flex: "1 1 200px" }}>
                              <Typography.Text ellipsis title={ex.name} style={{ margin: 0 }}>
                                {ex.name}
                              </Typography.Text>
                              <Tag
                                style={{ margin: 0, fontSize: 11, lineHeight: "18px", flexShrink: 0 }}
                                color="geekblue"
                              >
                                {t("workouts.pickerBadgeCatalog")}
                              </Tag>
                            </Flex>
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => addExerciseFromPicker(ex)}
                            >
                              {t("workouts.pickerAddExercise")}
                            </Button>
                          </Flex>
                        ))}
                      </>
                    ) : null}
                  </Space>
                )}
              </div>
            </Space>
          )}
        </div>
      </Modal>

      <Modal
        title={t("workouts.mergeModalTitle")}
        open={mergeModal != null}
        okText={t("workouts.mergeModalOk")}
        onOk={() => {
          if (!mergeModal) return;
          pushItems(
            mergeDraggedAfterTarget(
              items,
              mergeModal.activeLocalId,
              mergeModal.targetLocalId,
              mergePickType,
            ),
          );
          setMergeModal(null);
        }}
        onCancel={() => setMergeModal(null)}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("workouts.mergeModalHint")}
        </Typography.Paragraph>
        <Select<WorkoutBlockType>
          style={{ width: "100%" }}
          value={mergePickType}
          onChange={(v) => setMergePickType(v)}
          options={BLOCK_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        />
      </Modal>

    </div>
  );
}

export function workoutLinesFromApiItems(
  raw: Array<{
    exercise_id: number;
    sort_order: number;
    sets?: number | null;
    reps?: number | null;
    duration_sec?: number | null;
    rest_sec?: number | null;
    notes?: string | null;
    block_id?: string | null;
    block_type?: string | null;
    block_sequence?: number | null;
    exercise?: { name?: string };
    exercise_name?: string | null;
  }>,
): WorkoutLine[] {
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      localId: newLocalId(),
      exercise_id: row.exercise_id,
      sort_order: row.sort_order,
      sets: row.sets ?? null,
      reps: row.reps ?? null,
      duration_sec: row.duration_sec ?? null,
      rest_sec: row.rest_sec ?? null,
      notes: row.notes ?? null,
      exercise_name: row.exercise?.name ?? row.exercise_name ?? undefined,
      block_id: row.block_id?.trim() ? row.block_id.trim() : null,
      block_type: (row.block_type as WorkoutBlockType) || null,
      block_sequence:
        row.block_sequence != null && !Number.isNaN(Number(row.block_sequence))
          ? Number(row.block_sequence)
          : undefined,
    }));
}
