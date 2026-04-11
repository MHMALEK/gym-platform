import {
  DeleteOutlined,
  HolderOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
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
  Tooltip,
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
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../lib/api";
import {
  type WorkoutBlockType,
  type WorkoutLine,
  contiguousLegacyExerciseRun,
  effectiveNotes,
  effectiveNumeric,
  exerciseGroupRange,
  insertLinkedExerciseAfter,
  insertSetBelowGroupEnd,
  isBundleHeadRow,
  isMergeDragRoot,
  isWorkoutLineSetLikeRow,
  mergeExerciseBundleAfterTarget,
  normalizeBundleDropOverIndex,
  newExerciseWithOneSet,
  newLocalId,
  normalizeWorkoutLinesForApi,
  orderedExerciseHeadLocalIds,
  reorderExerciseBundleInList,
  setCountInGroup,
  setOrdinalInGroup,
  setRowUISegment,
  validateWorkoutLinesSequence,
} from "../lib/workoutLineModel";

export type { WorkoutBlockType, WorkoutLine } from "../lib/workoutLineModel";
export { normalizeWorkoutLinesForApi as normalizeWorkoutItemsForApi, workoutLinesFromApiItems } from "../lib/workoutLineModel";

type ExerciseOpt = { id: number; name: string; source: "catalog" | "mine" };

function legacyRowUISegment(
  items: WorkoutLine[],
  index: number,
): "single" | "runFirst" | "runMiddle" | "runLast" {
  const [lo, hi] = contiguousLegacyExerciseRun(items, index);
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

/** Drop on another exercise’s name area to group (merge) after that exercise. */
const MERGE_INTO_PREFIX = "merge-into:";

function mergeIntoDroppableId(headLocalId: string) {
  return `${MERGE_INTO_PREFIX}${headLocalId}`;
}

/** Left action column width — keep merge-drop `marginLeft` in sync */
const WORKOUT_ROW_RAIL_WIDTH = 44;

const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 16,
  padding: "12px 12px 10px",
  borderRadius: 16,
  border: "1px solid color-mix(in srgb, var(--ant-color-primary) 11%, var(--app-border, rgba(148, 163, 184, 0.2)))",
  background:
    "linear-gradient(165deg, color-mix(in srgb, var(--ant-color-primary) 9%, var(--app-surface, #121826)) 0%, color-mix(in srgb, var(--ant-color-primary) 4%, var(--app-surface, #121826)) 100%)",
  boxShadow:
    "0 2px 12px rgba(0, 0, 0, 0.12), inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent)",
};

const exerciseGroupInBlockShellStyle: CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px 8px",
  borderRadius: 12,
  border: "1px solid color-mix(in srgb, var(--app-border, rgba(148, 163, 184, 0.16)) 88%, var(--ant-color-primary) 12%)",
  background: "color-mix(in srgb, var(--app-surface-elevated, #1a2130) 94%, var(--ant-color-primary) 6%)",
};

const rowActionsRailStyle: CSSProperties = {
  width: WORKOUT_ROW_RAIL_WIDTH,
  flexShrink: 0,
  padding: "12px 4px 12px 6px",
  borderRight: "1px solid color-mix(in srgb, var(--app-border, rgba(148, 163, 184, 0.14)) 100%, transparent)",
  background: "color-mix(in srgb, var(--app-surface-elevated, #1a2234) 78%, transparent)",
};

function AddSetBelowFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      style={{
        marginTop: 6,
        paddingTop: 12,
        borderTop: "1px dashed color-mix(in srgb, var(--ant-color-primary) 14%, var(--app-border, rgba(148,163,184,0.22)))",
      }}
    >
      <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}

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

function workoutCollisionDetection(args: Parameters<CollisionDetection>[0]) {
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

  const sortableOnly = args.droppableContainers.filter((c) => !String(c.id).startsWith(MERGE_INTO_PREFIX));
  return closestCenter({ ...args, droppableContainers: sortableOnly });
}

function blockAccent(blockId: string): string {
  let h = 0;
  for (let i = 0; i < blockId.length; i++) h = (h * 31 + blockId.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 52%)`;
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

type RowPresentation = "exercise_head" | "set_under" | "legacy_combined";

type DragHandleBag = { attributes: DraggableAttributes; listeners: Record<string, unknown> | undefined };

/** One sortable item = whole exercise (head + sets); drag handle lives on the head row only.
 *  Merge droppable shares the same DOM node so dropping anywhere on the card hits “group here”, not only the title. */
function SortableExerciseGroup({
  headLocalId,
  shellStyle,
  mergeDropEnabled,
  activeDragHeadId,
  children,
}: {
  headLocalId: string;
  shellStyle: CSSProperties;
  /** While dragging another exercise, enables merge target on this whole card. */
  mergeDropEnabled: boolean;
  activeDragHeadId: string | null;
  children: (handle: DragHandleBag) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: headLocalId,
    transition: null,
    animateLayoutChanges: () => false,
  });
  const { setNodeRef: setMergeRef, isOver: mergeDropOver } = useDroppable({
    id: mergeIntoDroppableId(headLocalId),
    disabled: !mergeDropEnabled || activeDragHeadId === headLocalId,
  });
  const setCardRef = (el: HTMLDivElement | null) => {
    setSortableRef(el);
    setMergeRef(el);
  };
  const mergeOutline =
    mergeDropEnabled && mergeDropOver
      ? "2px solid color-mix(in srgb, var(--ant-color-primary) 65%, var(--app-border, rgba(148,163,184,0.35)))"
      : mergeDropEnabled
        ? "1px dashed color-mix(in srgb, var(--ant-color-primary) 35%, var(--app-border, rgba(148,163,184,0.35)))"
        : undefined;
  /** Subtle frame so cards read as draggable targets when idle (hidden while this card is dragged). */
  const idleDndAffordance =
    !isDragging && !mergeOutline
      ? "1px solid color-mix(in srgb, var(--ant-color-primary) 14%, var(--app-border, rgba(148,163,184,0.2)))"
      : undefined;

  return (
    <div
      ref={setCardRef}
      style={{
        ...shellStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.22 : 1,
        outline: mergeOutline ?? idleDndAffordance,
        outlineOffset: mergeOutline || idleDndAffordance ? 2 : undefined,
      }}
    >
      {children({ attributes, listeners: listeners as Record<string, unknown> | undefined })}
    </div>
  );
}

function WorkoutRow({
  row,
  index,
  items,
  presentation,
  insideBlock,
  packInExerciseGroup,
  blockStepLabel,
  setLabel,
  setRunSegment,
  canExtendLink,
  onPickExtendBlock,
  dragHandleProps,
  t,
  updateAt,
  removeAt,
}: {
  row: WorkoutLine;
  index: number;
  items: WorkoutLine[];
  presentation: RowPresentation;
  insideBlock: boolean;
  packInExerciseGroup: boolean;
  blockStepLabel: string | null;
  setLabel: string;
  setRunSegment: "single" | "runFirst" | "runMiddle" | "runLast";
  canExtendLink: boolean;
  onPickExtendBlock: () => void;
  dragHandleProps?: DragHandleBag;
  t: TFunction<"translation">;
  updateAt: (i: number, patch: Partial<WorkoutLine>) => void;
  removeAt: (i: number) => void;
}) {
  const isSetUnder = presentation === "set_under";
  const isLegacyExtra =
    presentation === "legacy_combined" && (setRunSegment === "runMiddle" || setRunSegment === "runLast");
  const isExtraSetRow =
    (presentation === "set_under" && (setRunSegment === "runMiddle" || setRunSegment === "runLast")) ||
    isLegacyExtra;
  const rowStripe =
    insideBlock || !row.block_id
      ? "4px solid transparent"
      : `4px solid ${blockAccent(row.block_id)}`;

  const setRail = "3px solid color-mix(in srgb, var(--ant-color-primary) 26%, transparent)";
  const headSurface =
    "color-mix(in srgb, var(--app-surface-elevated, #1d2536) 91%, var(--ant-color-primary) 9%)";
  const setSurface = "color-mix(in srgb, var(--app-surface, #131a26) 93%, var(--ant-color-primary) 7%)";
  const headBorder =
    "1px solid color-mix(in srgb, var(--app-border, rgba(148,163,184,0.16)) 78%, var(--ant-color-primary) 22%)";
  const setBorder =
    "1px solid color-mix(in srgb, var(--app-border, rgba(148,163,184,0.12)) 82%, var(--ant-color-primary) 18%)";
  const setDividerTop =
    "1px solid color-mix(in srgb, var(--app-border, rgba(148,163,184,0.1)) 70%, var(--ant-color-primary) 30%)";
  const nestedBorder = "1px solid color-mix(in srgb, var(--ant-color-primary) 14%, var(--app-border, rgba(148,163,184,0.18)))";

  const displayReps = isSetUnder ? effectiveNumeric(items, index, "reps") : row.reps;
  const displayDur = isSetUnder ? effectiveNumeric(items, index, "duration_sec") : row.duration_sec;
  const displayRest = isSetUnder ? effectiveNumeric(items, index, "rest_sec") : row.rest_sec;
  const displayNotes = isSetUnder ? effectiveNotes(items, index) ?? "" : row.notes ?? "";

  const hasSetOverride =
    isSetUnder &&
    (row.reps != null ||
      row.duration_sec != null ||
      row.rest_sec != null ||
      (row.notes != null && row.notes !== ""));

  const hideBlockColumnOnRow = packInExerciseGroup && (isSetUnder || isLegacyExtra);
  /** Drag handle only on bundle heads (exercise row or first legacy line) */
  const showRowDragHandle = isBundleHeadRow(items, index);
  const compactSetExerciseUi = packInExerciseGroup && isSetUnder;
  const showCompactExerciseColumn = compactSetExerciseUi || isLegacyExtra;

  let borderRadius: string | number = 10;
  let marginTop = 0;
  let marginBottom = insideBlock ? 0 : 10;
  let paddingTop = 14;
  let paddingBottom = 14;
  let background = headSurface;
  let border = headBorder;
  let borderTop: string | undefined;
  let borderBottom: string | undefined;
  let extraPaddingLeft = 0;

  if (presentation === "exercise_head") {
    if (packInExerciseGroup && setCountInGroup(items, index) >= 1) {
      borderRadius = "14px 14px 0 0";
      marginBottom = 0;
      paddingBottom = 12;
      border = headBorder;
      borderBottom = "none";
      background = headSurface;
    } else {
      borderRadius = 14;
      marginBottom = insideBlock ? 8 : 8;
      paddingBottom = 12;
      background = headSurface;
      border = headBorder;
    }
  } else if (setRunSegment === "runFirst") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 8 : 10;
    marginBottom = packInExerciseGroup ? 0 : 6;
    paddingTop = 12;
    paddingBottom = 12;
    borderRadius = packInExerciseGroup ? 0 : 10;
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    borderTop = packInExerciseGroup ? setDividerTop : undefined;
    extraPaddingLeft = packInExerciseGroup ? 14 : 10;
  } else if (setRunSegment === "runMiddle") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 8 : 10;
    marginBottom = packInExerciseGroup ? 0 : 6;
    paddingTop = 12;
    paddingBottom = 12;
    borderRadius = packInExerciseGroup ? 0 : 10;
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    if (packInExerciseGroup) borderTop = "none";
    extraPaddingLeft = packInExerciseGroup ? 14 : 10;
  } else if (setRunSegment === "runLast") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 8 : 10;
    marginBottom = insideBlock ? 0 : packInExerciseGroup ? 0 : 14;
    paddingTop = 12;
    paddingBottom = 14;
    borderRadius = packInExerciseGroup ? "0 0 14px 14px" : "10px 10px 14px 14px";
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    if (packInExerciseGroup) borderTop = "none";
    extraPaddingLeft = packInExerciseGroup ? 14 : 10;
  } else if (presentation === "set_under" && packInExerciseGroup && setRunSegment === "single") {
    marginTop = 0;
    marginBottom = insideBlock ? 0 : 0;
    paddingTop = 12;
    paddingBottom = 14;
    borderRadius = "0 0 14px 14px";
    background = setSurface;
    border = setBorder;
    borderTop = setDividerTop;
    extraPaddingLeft = 14;
  }

  if (packInExerciseGroup && presentation === "exercise_head" && setCountInGroup(items, index) < 1) {
    marginBottom = insideBlock ? 8 : 8;
  }

  if (isExtraSetRow) {
    paddingTop = Math.min(paddingTop, 12);
    paddingBottom = Math.min(paddingBottom, 12);
  }

  const style: CSSProperties = {
    borderLeft: isExtraSetRow || isLegacyExtra ? setRail : rowStripe,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop,
    paddingBottom,
    marginTop,
    marginBottom,
    background,
    border,
    ...(borderTop !== undefined ? { borderTop } : {}),
    ...(borderBottom !== undefined ? { borderBottom } : {}),
    borderRadius,
    boxShadow:
      presentation === "exercise_head" && !(packInExerciseGroup && setCountInGroup(items, index) >= 1)
        ? "0 1px 0 color-mix(in srgb, #fff 4%, transparent)"
        : undefined,
  };

  const labelTiny: CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "block",
    marginBottom: 4,
    opacity: 0.72,
    fontWeight: 500,
  };

  const contentPadLeft = 14 + extraPaddingLeft;
  const showHeadHint = presentation === "exercise_head" && setCountInGroup(items, index) > 1;
  const showLinkInRail =
    (presentation === "exercise_head" || (presentation === "legacy_combined" && !isExtraSetRow)) && canExtendLink;

  return (
    <div style={style}>
      <Flex align="stretch" gap={0} style={{ width: "100%" }}>
        <Flex vertical justify="flex-start" align="center" gap={2} style={rowActionsRailStyle}>
          {showRowDragHandle && dragHandleProps ? (
            <Tooltip
              placement="right"
              title={
                <div style={{ maxWidth: 280 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("workouts.rowToolbar.dragTooltipTitle")}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.92 }}>
                    {t("workouts.rowToolbar.dragTooltipBody")}
                  </div>
                </div>
              }
            >
              <Button
                type="text"
                size="small"
                icon={<HolderOutlined />}
                aria-label={t("workouts.rowToolbar.drag")}
                style={{
                  margin: 0,
                  cursor: "grab",
                  border: "1px dashed color-mix(in srgb, var(--ant-color-primary) 28%, var(--app-border, rgba(148,163,184,0.25)))",
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--ant-color-primary) 6%, transparent)",
                }}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              />
            </Tooltip>
          ) : showRowDragHandle ? (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          ) : (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          )}
          <Tooltip title={t("common.delete")} placement="right">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeAt(index)}
            />
          </Tooltip>
          {showLinkInRail ? (
            <Tooltip title={t("workouts.linkExerciseRow")} placement="right">
              <Button type="text" size="small" icon={<LinkOutlined />} onClick={onPickExtendBlock} />
            </Tooltip>
          ) : null}
          {isSetUnder && hasSetOverride ? (
            <Tooltip title={t("workouts.clearSetOverrides")} placement="right">
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                onClick={() =>
                  updateAt(index, { reps: null, duration_sec: null, rest_sec: null, notes: null })
                }
              />
            </Tooltip>
          ) : null}
        </Flex>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingLeft: contentPadLeft,
            paddingRight: 14,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {presentation === "legacy_combined" && setRunSegment === "runFirst" ? (
            <Typography.Text
              type="secondary"
              style={{
                display: "block",
                fontSize: 11,
                fontStyle: "italic",
                marginBottom: 8,
                opacity: 0.9,
              }}
            >
              {t("workouts.setsGroupedSubtitle")}
            </Typography.Text>
          ) : null}
          {showHeadHint ? (
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, marginBottom: 8, opacity: 0.88 }}>
              {t("workouts.exerciseHeadAppliesToSets")}
            </Typography.Text>
          ) : null}
          <Flex vertical gap={12} style={{ width: "100%" }}>
            <Flex wrap="wrap" gap={8} align="flex-start" style={{ rowGap: 14, columnGap: 10 }}>
              {!hideBlockColumnOnRow ? (
                <div style={{ minWidth: 100, maxWidth: 140 }}>
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
              ) : null}
              {presentation === "exercise_head" ? (
                <div
                  style={{
                    position: "relative",
                    flex: "1 1 240px",
                    minWidth: 168,
                  }}
                >
                  <Typography.Text type="secondary" style={labelTiny}>
                    {t("workouts.colExerciseBlock")}
                  </Typography.Text>
                  <Typography.Text
                    strong
                    style={{
                      fontSize: 17,
                      fontWeight: 650,
                      lineHeight: 1.35,
                      display: "block",
                      letterSpacing: "-0.01em",
                      color: "var(--ant-color-text)",
                    }}
                    ellipsis={{ tooltip: row.exercise_name ?? `ID ${row.exercise_id}` }}
                  >
                    {row.exercise_name ?? `ID ${row.exercise_id}`}
                  </Typography.Text>
                </div>
              ) : (
                <Flex
                  align="flex-start"
                  gap={compactSetExerciseUi ? 10 : 14}
                  style={{
                    flex: "1 1 240px",
                    minWidth: compactSetExerciseUi ? 148 : 188,
                    borderLeft:
                      showCompactExerciseColumn && !compactSetExerciseUi
                        ? "1px solid color-mix(in srgb, var(--ant-color-primary) 18%, var(--app-border, rgba(148,163,184,0.2)))"
                        : undefined,
                    paddingLeft: showCompactExerciseColumn && !compactSetExerciseUi ? 14 : 0,
                    marginLeft: showCompactExerciseColumn && !compactSetExerciseUi ? 4 : 0,
                  }}
                >
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 38 }}>
                    <Typography.Text type="secondary" style={{ ...labelTiny, marginBottom: 5, fontSize: 9 }}>
                      {t("workouts.colSet")}
                    </Typography.Text>
                    <Tag
                      color={hasSetOverride ? "warning" : showCompactExerciseColumn ? "default" : "processing"}
                      style={{
                        margin: 0,
                        minWidth: 34,
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: "22px",
                        padding: "0 9px",
                        borderRadius: 6,
                        border: "1px solid color-mix(in srgb, var(--app-border, rgba(148,163,184,0.25)) 100%, transparent)",
                        background: "color-mix(in srgb, var(--app-surface-elevated, #1a2234) 85%, transparent)",
                      }}
                    >
                      {setLabel}
                    </Tag>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      position: "relative",
                    }}
                  >
                    {!showCompactExerciseColumn ? (
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
                        <Typography.Text type="secondary" style={{ ...labelTiny, marginBottom: 4, fontSize: 9 }}>
                          {isSetUnder ? t("workouts.setInheritsHint") : t("workouts.extraSetExerciseLabel")}
                        </Typography.Text>
                        <Typography.Text
                          type="secondary"
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            display: "block",
                            opacity: 0.92,
                            fontWeight: 500,
                          }}
                          ellipsis={{ tooltip: row.exercise_name ?? `ID ${row.exercise_id}` }}
                        >
                          {row.exercise_name ?? `ID ${row.exercise_id}`}
                        </Typography.Text>
                      </>
                    )}
                  </div>
                </Flex>
              )}
            </Flex>
            <Flex
              wrap="wrap"
              gap={8}
              align="center"
              style={{
                width: "100%",
                rowGap: 10,
                paddingTop: 2,
                borderTop: "1px solid color-mix(in srgb, var(--app-border, rgba(148,163,184,0.12)) 100%, transparent)",
              }}
            >
              <InputNumber
                min={0}
                size="small"
                style={{ width: 76 }}
                placeholder={t("workouts.colReps")}
                value={displayReps ?? undefined}
                onChange={(v) => updateAt(index, { reps: v == null ? null : Number(v) })}
              />
              <InputNumber
                min={0}
                size="small"
                style={{ width: 84 }}
                placeholder={t("workouts.colDurationSec")}
                value={displayDur ?? undefined}
                onChange={(v) => updateAt(index, { duration_sec: v == null ? null : Number(v) })}
              />
              <InputNumber
                min={0}
                size="small"
                style={{ width: 84 }}
                placeholder={t("workouts.colRestSec")}
                value={displayRest ?? undefined}
                onChange={(v) => updateAt(index, { rest_sec: v == null ? null : Number(v) })}
              />
              <Input
                size="small"
                style={{ flex: "1 1 220px", minWidth: 168, maxWidth: 520 }}
                placeholder={t("workouts.colTipsNotes")}
                value={displayNotes}
                onChange={(e) => updateAt(index, { notes: e.target.value || null })}
              />
            </Flex>
          </Flex>
        </div>
      </Flex>
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
  /** Add-exercise picker in a modal (opened from the button below the list or from “Link exercise” on a block row). */
  const [exercisePickerModalOpen, setExercisePickerModalOpen] = useState(false);
  const pickerContextRef = useRef<PickerContext>({ mode: "append" });
  /** Mirrors ref so the UI can show which add mode is active (append vs linking). */
  const [pickerBanner, setPickerBanner] = useState<PickerContext>({ mode: "append" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const venueCompat = useMemo(() => {
    if (planVenue === "home" || planVenue === "commercial_gym") return planVenue;
    return undefined;
  }, [planVenue]);

  const mergeDragEligible = useMemo(() => {
    if (!activeDragId) return false;
    const i = items.findIndex((r) => r.localId === activeDragId);
    if (i < 0) return false;
    return isMergeDragRoot(items, i);
  }, [activeDragId, items]);

  const mergeDropActiveForHead = useCallback(
    (targetHeadLocalId: string) =>
      Boolean(activeDragId && activeDragId !== targetHeadLocalId && mergeDragEligible),
    [activeDragId, mergeDragEligible],
  );

  const sortableHeadIds = useMemo(() => orderedExerciseHeadLocalIds(items), [items]);

  const activeDragBundleRows = useMemo(() => {
    if (!activeDragId) return [] as WorkoutLine[];
    const i = items.findIndex((r) => r.localId === activeDragId);
    if (i < 0) return [];
    const [lo, hi] = exerciseGroupRange(items, i);
    return items.slice(lo, hi + 1);
  }, [activeDragId, items]);

  useEffect(() => {
    const next = (initialItems ?? []).map((x, i) => ({
      ...x,
      localId: x.localId || newLocalId(),
      sort_order: i,
      block_id: x.block_id ?? null,
      block_type: x.block_type ?? null,
      row_type: x.row_type ?? "legacy_line",
      exercise_instance_id: x.exercise_instance_id ?? null,
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

  /** Re-index, validate exercise/set sequence (matches API), then commit. */
  const applyOrderedItems = useCallback(
    (next: WorkoutLine[]) => {
      const normalized = next.map((r, i) => ({ ...r, sort_order: i }));
      const err = validateWorkoutLinesSequence(normalized);
      if (err) {
        message.warning(t("workouts.invalidWorkoutOrder"));
        return false;
      }
      pushItems(normalized);
      return true;
    },
    [message, pushItems, t],
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
        next = insertLinkedExerciseAfter(items, ctx.afterIndex, ex);
      } else {
        next = [...items, ...newExerciseWithOneSet(ex)];
      }
      pushItems(next.map((r, i) => ({ ...r, sort_order: i })));
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

      if (overId.startsWith(MERGE_INTO_PREFIX)) {
        const targetHeadLocalId = overId.slice(MERGE_INTO_PREFIX.length);
        if (targetHeadLocalId === activeLocalId) return;

        const ai = items.findIndex((x) => x.localId === activeLocalId);
        const ti = items.findIndex((x) => x.localId === targetHeadLocalId);
        if (ai < 0 || ti < 0) return;

        const [exLo] = exerciseGroupRange(items, ai);
        const headLocalId = items[exLo]?.localId;
        if (!headLocalId || headLocalId === targetHeadLocalId) return;

        const targetRow = items[ti];
        if (targetRow.block_id?.trim()) {
          applyOrderedItems(mergeExerciseBundleAfterTarget(items, headLocalId, targetHeadLocalId, "superset"));
        } else {
          setMergePickType("superset");
          setMergeModal({ activeLocalId: headLocalId, targetLocalId: targetHeadLocalId });
        }
        return;
      }

      if (activeLocalId === overId) return;
      const oldIndex = items.findIndex((x) => x.localId === activeLocalId);
      const newIndex = items.findIndex((x) => x.localId === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const [gLo, gHi] = exerciseGroupRange(items, oldIndex);

      if (!isBundleHeadRow(items, oldIndex)) {
        return;
      }

      if (isWorkoutLineSetLikeRow(items, newIndex)) {
        message.info(t("workouts.dropExerciseOnHeadOrMergeZone"));
        return;
      }

      if (gHi > gLo && oldIndex === gLo && newIndex > gLo && newIndex <= gHi) {
        return;
      }

      const activeRow = items[gLo];
      if (activeRow.block_id?.trim()) {
        const [blo, bhi] = contiguousBlockRange(items, gLo);
        if (newIndex < blo || newIndex > bhi) {
          applyOrderedItems(reorderWithBlocks(items, gLo, newIndex));
        } else {
          const overN = normalizeBundleDropOverIndex(items, gLo, newIndex);
          applyOrderedItems(reorderExerciseBundleInList(items, gLo, overN));
        }
        return;
      }

      const overN = normalizeBundleDropOverIndex(items, gLo, newIndex);
      applyOrderedItems(reorderExerciseBundleInList(items, gLo, overN));
    },
    [applyOrderedItems, items, message, t],
  );

  const removeAt = useCallback(
    (index: number) => {
      const [lo, hi] = exerciseGroupRange(items, index);
      const row = items[index];
      if (row.row_type === "exercise") {
        const next = items.filter((_, i) => i < lo || i > hi);
        pushItems(next.map((r, i) => ({ ...r, sort_order: i })));
        return;
      }
      if (row.row_type === "set") {
        if (hi - lo <= 1) {
          const next = items.filter((_, i) => i < lo || i > hi);
          pushItems(next.map((r, i) => ({ ...r, sort_order: i })));
          return;
        }
        const next = items.filter((_, i) => i !== index);
        pushItems(next.map((r, i) => ({ ...r, sort_order: i })));
        return;
      }
      const next = items.filter((_, i) => i !== index);
      pushItems(next.map((r, i) => ({ ...r, sort_order: i })));
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
      pushItems(insertSetBelowGroupEnd(items, index));
    },
    [items, pushItems],
  );

  const saveTrainingPlan = useCallback(async () => {
    if (!planId) return;
    setSaving(true);
    try {
      /* Backend persists row_type, exercise_instance_id, block_id, block_type and assigns block_sequence. */
      const res = await fetch(`${apiPrefix}/training-plans/${planId}/items`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(normalizeWorkoutLinesForApi(items)),
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
          collisionDetection={workoutCollisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 14 }}
            message={t("workouts.dndGuideTitle")}
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", lineHeight: 1.55 }}>
                {t("workouts.dndGuideBody")}
              </Typography.Text>
            }
          />
          <SortableContext items={sortableHeadIds} strategy={verticalListSortingStrategy}>
            {(() => {
              const nodes: ReactNode[] = [];
              let i = 0;
              while (i < items.length) {
                const row = items[i];
                if (!row.block_id) {
                  const [lo, hi] = exerciseGroupRange(items, i);
                  nodes.push(
                    <SortableExerciseGroup
                      key={`exercise-group-${items[lo].localId}`}
                      headLocalId={items[lo].localId}
                      shellStyle={exerciseGroupShellStyle}
                      mergeDropEnabled={mergeDropActiveForHead(items[lo].localId)}
                      activeDragHeadId={activeDragId}
                    >
                      {(drag) => (
                        <>
                          {Array.from({ length: hi - lo + 1 }, (_, off) => {
                            const idx = lo + off;
                            const r = items[idx];
                            const presentation: RowPresentation =
                              r.row_type === "exercise"
                                ? "exercise_head"
                                : r.row_type === "set"
                                  ? "set_under"
                                  : "legacy_combined";
                            const setOrd = setOrdinalInGroup(items, idx);
                            const setLabel =
                              presentation === "exercise_head" ? "—" : t("workouts.setNumber", { n: setOrd });
                            const setRunSegment: "single" | "runFirst" | "runMiddle" | "runLast" =
                              presentation === "exercise_head"
                                ? "single"
                                : presentation === "set_under"
                                  ? setRowUISegment(items, idx)
                                  : legacyRowUISegment(items, idx);
                            return (
                              <Fragment key={r.localId}>
                                <WorkoutRow
                                  row={r}
                                  index={idx}
                                  items={items}
                                  presentation={presentation}
                                  insideBlock={false}
                                  packInExerciseGroup
                                  blockStepLabel={null}
                                  setLabel={setLabel}
                                  setRunSegment={setRunSegment}
                                  canExtendLink={false}
                                  onPickExtendBlock={() => armPickerContext({ mode: "extendBlock", afterIndex: idx })}
                                  dragHandleProps={idx === lo ? drag : undefined}
                                  t={t}
                                  updateAt={updateAt}
                                  removeAt={removeAt}
                                />
                              </Fragment>
                            );
                          })}
                          <AddSetBelowFooter onClick={() => addSetBelow(hi)} label={t("workouts.addSetBelow")} />
                        </>
                      )}
                    </SortableExerciseGroup>,
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
                      marginBottom: 16,
                      padding: "12px 14px 10px",
                      borderRadius: 16,
                      border: "1px solid color-mix(in srgb, var(--app-border, rgba(148, 163, 184, 0.2)) 82%, var(--ant-color-primary) 18%)",
                      borderLeft: `4px solid ${accent}`,
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--app-surface, #121826) 96%, var(--ant-color-primary) 4%) 0%, color-mix(in srgb, var(--app-surface, #121826) 98%, transparent) 100%)",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Flex justify="space-between" align="flex-start" wrap="wrap" gap={10} style={{ marginBottom: 8 }}>
                      <Flex vertical gap={6} style={{ minWidth: 0, flex: "1 1 240px" }}>
                        <Typography.Text
                          type="secondary"
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: 0,
                            opacity: 0.85,
                          }}
                        >
                          {t("workouts.blockGroupLabel")}
                        </Typography.Text>
                        <Flex align="center" gap={10} wrap="wrap">
                          <Select<WorkoutBlockType>
                            size="small"
                            style={{ minWidth: 176, maxWidth: 260 }}
                            value={bt}
                            options={BLOCK_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                            onChange={(v) => updateBlockType(bid, v)}
                          />
                          <Tag style={{ margin: 0 }} color="processing">
                            {t("workouts.blockMemberCount", { count: blockLen })}
                          </Tag>
                        </Flex>
                      </Flex>
                      <Tooltip title={t("workouts.blockDragBundleHint")}>
                        <QuestionCircleOutlined
                          style={{
                            color: "var(--ant-color-text-tertiary)",
                            fontSize: 16,
                            cursor: "help",
                            marginTop: 2,
                          }}
                        />
                      </Tooltip>
                    </Flex>
                    {(() => {
                      const dividerStyle: CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        margin: "2px 0 6px 8px",
                        color: "var(--ant-color-text-tertiary)",
                        fontSize: 11,
                      };
                      let k = 0;
                      const blockChildren: ReactNode[] = [];
                      while (k < blockLen) {
                        const globalIndex = start + k;
                        const [lo, hi] = exerciseGroupRange(items, globalIndex);
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
                            <SortableExerciseGroup
                              headLocalId={items[lo].localId}
                              shellStyle={exerciseGroupInBlockShellStyle}
                              mergeDropEnabled={mergeDropActiveForHead(items[lo].localId)}
                              activeDragHeadId={activeDragId}
                            >
                              {(drag) => (
                                <>
                                  {Array.from({ length: hi - lo + 1 }, (_, d) => {
                                    const idx = lo + d;
                                    const r = items[idx];
                                    const stepLabel = t("workouts.blockMemberStep", {
                                      current: idx - start + 1,
                                      total: blockLen,
                                    });
                                    const presentation: RowPresentation =
                                      r.row_type === "exercise"
                                        ? "exercise_head"
                                        : r.row_type === "set"
                                          ? "set_under"
                                          : "legacy_combined";
                                    const setOrd = setOrdinalInGroup(items, idx);
                                    const setLabelInner =
                                      presentation === "exercise_head" ? "—" : t("workouts.setNumber", { n: setOrd });
                                    const seg: "single" | "runFirst" | "runMiddle" | "runLast" =
                                      presentation === "exercise_head"
                                        ? "single"
                                        : presentation === "set_under"
                                          ? setRowUISegment(items, idx)
                                          : legacyRowUISegment(items, idx);
                                    return (
                                      <Fragment key={r.localId}>
                                        <WorkoutRow
                                          row={r}
                                          index={idx}
                                          items={items}
                                          presentation={presentation}
                                          insideBlock
                                          packInExerciseGroup
                                          blockStepLabel={stepLabel}
                                          setLabel={setLabelInner}
                                          setRunSegment={seg}
                                          canExtendLink
                                          onPickExtendBlock={() =>
                                            armPickerContext({ mode: "extendBlock", afterIndex: idx })
                                          }
                                          dragHandleProps={idx === lo ? drag : undefined}
                                          t={t}
                                          updateAt={updateAt}
                                          removeAt={removeAt}
                                        />
                                      </Fragment>
                                    );
                                  })}
                                  <AddSetBelowFooter onClick={() => addSetBelow(hi)} label={t("workouts.addSetBelow")} />
                                </>
                              )}
                            </SortableExerciseGroup>
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
            {activeDragBundleRows.length > 0 ? (
              <div
                style={{
                  padding: "12px 16px",
                  minWidth: 280,
                  maxWidth: 440,
                  borderRadius: 12,
                  background: "var(--app-surface-elevated, #1a2234)",
                  border: "1px solid color-mix(in srgb, var(--ant-color-primary) 45%, var(--app-border, rgba(148,163,184,0.3)))",
                  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.38)",
                  cursor: "grabbing",
                }}
              >
                {activeDragBundleRows.length > 1 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                    {t("workouts.dragBundleTogether", { count: activeDragBundleRows.length })}
                  </Typography.Text>
                ) : null}
                {(() => {
                  let setOrd = 0;
                  return activeDragBundleRows.map((line, bi) => {
                    const name = line.exercise_name ?? `ID ${line.exercise_id}`;
                    if (line.row_type === "set") setOrd += 1;
                    const showSetTag = line.row_type === "set" || (line.row_type === "legacy_line" && bi > 0);
                    const n = line.row_type === "set" ? setOrd : bi + 1;
                    return (
                      <div
                        key={line.localId}
                        style={{
                          paddingTop: bi ? 8 : 0,
                          marginTop: bi ? 8 : 0,
                          borderTop: bi ? "1px dashed color-mix(in srgb, var(--ant-color-primary) 28%, var(--app-border, rgba(148,163,184,0.25)))" : undefined,
                        }}
                      >
                        {showSetTag ? (
                          <Space align="center" size={8} style={{ width: "100%" }}>
                            <Tag style={{ margin: 0 }}>{t("workouts.setNumber", { n })}</Tag>
                            <Typography.Text strong style={{ fontSize: 14 }} ellipsis>
                              {name}
                            </Typography.Text>
                          </Space>
                        ) : (
                          <>
                            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                              {t("workouts.colExerciseBlock")}
                            </Typography.Text>
                            <Typography.Text strong style={{ fontSize: 15 }} ellipsis>
                              {name}
                            </Typography.Text>
                          </>
                        )}
                      </div>
                    );
                  });
                })()}
                <Divider style={{ margin: "12px 0 8px" }} />
                <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", lineHeight: 1.5 }}>
                  {t("workouts.dragOverlayHints")}
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
          const ok = applyOrderedItems(
            mergeExerciseBundleAfterTarget(
              items,
              mergeModal.activeLocalId,
              mergeModal.targetLocalId,
              mergePickType,
            ),
          );
          if (ok) setMergeModal(null);
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
