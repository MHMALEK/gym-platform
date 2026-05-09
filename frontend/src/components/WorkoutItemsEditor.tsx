import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import UndoIcon from "@mui/icons-material/Undo";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
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
import { WorkoutFlex as Flex } from "./WorkoutFlex";
import { useAppMessage } from "../lib/useAppMessage";
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
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../lib/api";
import {
  type WorkoutBlockType,
  type WorkoutLine,
  contiguousLegacyExerciseRun,
  effectiveNumeric,
  effectiveText,
  exerciseGroupRange,
  insertLinkedExerciseAfter,
  insertSetBelowGroupEnd,
  isBundleHeadRow,
  isMergeDragRoot,
  isWorkoutLineSetLikeRow,
  mergeExerciseBundleAfterTarget,
  newExerciseWithOneSet,
  newExerciseWithOneSetInBlock,
  newLocalId,
  normalizeWorkoutLinesForApi,
  orderedExerciseHeadLocalIds,
  reorderWorkoutLinesByHeadMove,
  setCountInGroup,
  setOrdinalInGroup,
  setRowUISegment,
  stripBlocksWithFewerThanTwoExercises,
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

function contiguousBlockRange(items: WorkoutLine[], index: number): [number, number] {
  const bid = items[index]?.block_id;
  if (!bid) return [index, index];
  let lo = index;
  while (lo > 0 && items[lo - 1]?.block_id === bid) lo--;
  let hi = index;
  while (hi < items.length - 1 && items[hi + 1]?.block_id === bid) hi++;
  return [lo, hi];
}

/** How many exercise bundles (heads) sit in this block slice [blockStart, blockEnd] inclusive. */
function countExerciseBundlesInBlockSlice(items: WorkoutLine[], blockStart: number, blockEnd: number): number {
  let n = 0;
  let p = blockStart;
  while (p <= blockEnd && p < items.length) {
    const [, hi] = exerciseGroupRange(items, p);
    n += 1;
    p = hi + 1;
  }
  return n;
}

export function reorderWithBlocks(items: WorkoutLine[], activeIndex: number, overIndex: number): WorkoutLine[] {
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

/** Drop on another exercise’s name area to group (merge) after that exercise. */
const MERGE_INTO_PREFIX = "merge-into:";

function mergeIntoDroppableId(headLocalId: string) {
  return `${MERGE_INTO_PREFIX}${headLocalId}`;
}

/** Left action column width — keep merge-drop `marginLeft` in sync */
const WORKOUT_ROW_RAIL_WIDTH = 44;

/** Standalone exercise card — flat surface + subtle ring (theme-aware) */
const exerciseGroupShellStyle: CSSProperties = {
  marginBottom: 14,
  padding: 0,
  borderRadius: 16,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-elevated)",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 40px rgba(0, 0, 0, 0.08)",
};

/** Nested card inside a block — accent rail only */
function exerciseCardShellInBlock(blockAccent: string): CSSProperties {
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

const rowActionsRailStyle: CSSProperties = {
  width: WORKOUT_ROW_RAIL_WIDTH,
  flexShrink: 0,
  padding: "10px 6px",
  borderRight: "1px solid var(--app-border)",
  background: "color-mix(in srgb, var(--app-surface) 65%, transparent)",
};

function AddSetBelowFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      style={{
        marginTop: 0,
        padding: "10px 12px 12px",
        borderTop: "1px solid var(--app-border)",
      }}
    >
      <Button variant="outlined" fullWidth size="small" startIcon={<AddIcon />} onClick={onClick} style={{ borderRadius: 10 }}>
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
  /* Slightly higher chroma — reads like equipment / floor markers in gym apps */
  return `hsl(${h % 360} 62% 54%)`;
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

type PickerContext =
  | { mode: "append" }
  | { mode: "extendBlock"; afterIndex: number }
  | { mode: "newSupersetFirst" }
  | { mode: "newSupersetSecond"; afterHeadLocalId: string };

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
  const ring =
    isDragging
      ? "none"
      : mergeDropEnabled && mergeDropOver
        ? "0 0 0 2px var(--app-accent), 0 8px 24px rgba(0,0,0,0.1)"
        : mergeDropEnabled
          ? "0 0 0 1px dashed color-mix(in srgb, var(--app-accent) 45%, var(--app-border))"
          : "0 0 0 1px var(--app-border), 0 2px 8px rgba(0,0,0,0.04)";

  return (
    <div
      ref={setCardRef}
      style={{
        ...shellStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.38 : 1,
        boxShadow: ring,
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

  const setRail = "3px solid color-mix(in srgb, var(--app-accent) 50%, var(--app-border))";
  const headSurface = "var(--app-surface-elevated)";
  const setSurface = "var(--app-surface)";
  const headBorder = "1px solid var(--app-border)";
  const setBorder = "1px solid var(--app-border)";
  const setDividerTop = "1px solid var(--app-border)";
  const nestedBorder = "1px solid var(--app-border)";

  const displayReps = isSetUnder ? effectiveNumeric(items, index, "reps") : row.reps;
  const displayDur = isSetUnder ? effectiveNumeric(items, index, "duration_sec") : row.duration_sec;
  const displayRest = isSetUnder ? effectiveNumeric(items, index, "rest_sec") : row.rest_sec;
  const displayWeight = isSetUnder ? effectiveNumeric(items, index, "weight_kg") : row.weight_kg;
  const displayRpe = isSetUnder ? effectiveNumeric(items, index, "rpe") : row.rpe;
  const displayTempo = isSetUnder ? effectiveText(items, index, "tempo") ?? "" : row.tempo ?? "";
  const displayNotes = isSetUnder ? effectiveText(items, index, "notes") ?? "" : row.notes ?? "";

  const hasSetOverride =
    isSetUnder &&
    (row.reps != null ||
      row.duration_sec != null ||
      row.rest_sec != null ||
      row.weight_kg != null ||
      row.rpe != null ||
      (row.tempo != null && row.tempo !== "") ||
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
    boxShadow: undefined,
  };

  const labelTiny: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    display: "block",
    marginBottom: 4,
    color: "var(--app-text-muted)",
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
              <IconButton
                size="small"
                aria-label={t("workouts.rowToolbar.drag")}
                sx={{
                  margin: 0,
                  cursor: "grab",
                  borderRadius: "10px",
                  color: "var(--app-text-muted)",
                  background: "color-mix(in srgb, var(--app-accent) 8%, transparent)",
                }}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              >
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : showRowDragHandle ? (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          ) : (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          )}
          <Tooltip title={t("common.delete")} placement="right">
            <IconButton
              size="small"
              color="error"
              aria-label={t("common.delete")}
              onClick={() => removeAt(index)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {showLinkInRail ? (
            <Tooltip title={t("workouts.linkExerciseRow")} placement="right">
              <IconButton size="small" aria-label={t("workouts.linkExerciseRow")} onClick={onPickExtendBlock}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {isSetUnder && hasSetOverride ? (
            <Tooltip title={t("workouts.clearSetOverrides")} placement="right">
              <IconButton
                size="small"
                aria-label={t("workouts.clearSetOverrides")}
                onClick={() =>
                  updateAt(index, {
                    reps: null,
                    duration_sec: null,
                    rest_sec: null,
                    weight_kg: null,
                    rpe: null,
                    tempo: null,
                    notes: null,
                  })
                }
              >
                <UndoIcon fontSize="small" />
              </IconButton>
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
            <Typography
              variant="body2"
              color="text.secondary"
              component="span"
              style={{
                display: "block",
                fontSize: 11,
                fontStyle: "italic",
                marginBottom: 8,
                opacity: 0.9,
              }}
            >
              {t("workouts.setsGroupedSubtitle")}
            </Typography>
          ) : null}
          {showHeadHint ? (
            <Typography variant="body2" color="text.secondary" component="span" style={{ display: "block", fontSize: 11, marginBottom: 8, opacity: 0.88 }}>
              {t("workouts.exerciseHeadAppliesToSets")}
            </Typography>
          ) : null}
          <Flex vertical gap={12} style={{ width: "100%" }}>
            <Flex wrap="wrap" gap={8} align="flex-start" style={{ rowGap: 14, columnGap: 10 }}>
              {!hideBlockColumnOnRow ? (
                <div style={{ minWidth: 100, maxWidth: 140 }}>
                  <Typography variant="body2" color="text.secondary" component="span" style={labelTiny}>
                    {t("workouts.colBlock")}
                  </Typography>
                  {blockStepLabel ? (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 2,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        color: "var(--app-text-heading)",
                        background: "color-mix(in srgb, var(--app-accent) 12%, var(--app-surface-elevated))",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      {blockStepLabel}
                    </span>
                  ) : (
                    <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 12 }}>
                      {t("workouts.block.single")}
                    </Typography>
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
                  <Typography variant="body2" color="text.secondary" component="span" style={labelTiny}>
                    {t("workouts.colExerciseBlock")}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{
                      fontSize: 17,
                      lineHeight: 1.35,
                      display: "block",
                      letterSpacing: "-0.02em",
                      color: "var(--app-text-heading)",
                    }}
                    noWrap
                    title={row.exercise_name ?? `ID ${row.exercise_id}`}
                  >
                    {row.exercise_name ?? `ID ${row.exercise_id}`}
                  </Typography>
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
                        ? "1px solid color-mix(in srgb, var(--app-accent) 18%, var(--app-border, rgba(148,163,184,0.2)))"
                        : undefined,
                    paddingLeft: showCompactExerciseColumn && !compactSetExerciseUi ? 14 : 0,
                    marginLeft: showCompactExerciseColumn && !compactSetExerciseUi ? 4 : 0,
                  }}
                >
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 38 }}>
                    <Typography variant="body2" color="text.secondary" component="span" style={{ ...labelTiny, marginBottom: 5, fontSize: 9 }}>
                      {t("workouts.colSet")}
                    </Typography>
                    <Chip
                      size="small"
                      color={hasSetOverride ? "warning" : "default"}
                      label={setLabel}
                      sx={{
                        margin: 0,
                        minWidth: 36,
                        fontSize: 11,
                        fontWeight: 600,
                        height: 24,
                        borderRadius: 999,
                        bgcolor: hasSetOverride
                          ? undefined
                          : "color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated))",
                        color: "var(--app-text-heading)",
                      }}
                      variant={hasSetOverride ? "filled" : "outlined"}
                    />
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
                        <Typography variant="body2" color="text.secondary" component="span" style={labelTiny}>
                          {t("workouts.colExercise")}
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          sx={{ fontSize: 16, lineHeight: 1.35, display: "block" }}
                          noWrap
                          title={row.exercise_name ?? `ID ${row.exercise_id}`}
                        >
                          {row.exercise_name ?? `ID ${row.exercise_id}`}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" component="span" style={{ ...labelTiny, marginBottom: 4, fontSize: 9 }}>
                          {isSetUnder ? t("workouts.setInheritsHint") : t("workouts.extraSetExerciseLabel")}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            display: "block",
                            opacity: 0.92,
                            fontWeight: 500,
                          }}
                          noWrap
                          title={row.exercise_name ?? `ID ${row.exercise_id}`}
                        >
                          {row.exercise_name ?? `ID ${row.exercise_id}`}
                        </Typography>
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
                borderTop: "1px solid var(--app-border)",
              }}
            >
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{ width: 76, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={t("workouts.colReps")}
                value={displayReps ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    reps: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{ width: 84, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={t("workouts.colDurationSec")}
                value={displayDur ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    duration_sec: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{ width: 84, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={t("workouts.colRestSec")}
                value={displayRest ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    rest_sec: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0, step: 0.5 }}
                sx={{ width: 92, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={
                  t("workouts.colWeightKg") !== "workouts.colWeightKg"
                    ? t("workouts.colWeightKg")
                    : "kg"
                }
                aria-label={
                  t("workouts.colWeightKg") !== "workouts.colWeightKg"
                    ? t("workouts.colWeightKg")
                    : "Weight (kg)"
                }
                value={displayWeight ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    weight_kg: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
                sx={{ width: 80, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={
                  t("workouts.colRpe") !== "workouts.colRpe" ? t("workouts.colRpe") : "RPE"
                }
                aria-label={
                  t("workouts.colRpe") !== "workouts.colRpe"
                    ? t("workouts.colRpe")
                    : "RPE (0–10)"
                }
                value={displayRpe ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    updateAt(index, { rpe: null });
                    return;
                  }
                  const n = Number(raw);
                  if (Number.isNaN(n)) return;
                  // Clamp to RPE range; backend also validates 0–10.
                  const clamped = Math.min(10, Math.max(0, n));
                  updateAt(index, { rpe: clamped });
                }}
              />
              <TextField
                size="small"
                sx={{ width: 116, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                placeholder={
                  t("workouts.colTempo") !== "workouts.colTempo"
                    ? t("workouts.colTempo")
                    : "Tempo"
                }
                aria-label={
                  t("workouts.colTempo") !== "workouts.colTempo"
                    ? t("workouts.colTempo")
                    : "Tempo (e.g. 3-1-1-0)"
                }
                value={displayTempo}
                onChange={(e) => updateAt(index, { tempo: e.target.value || null })}
                inputProps={{ maxLength: 16 }}
              />
              <TextField
                size="small"
                sx={{ flex: "1 1 220px", minWidth: 168, maxWidth: 520, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
  const message = useAppMessage();
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
    (targetHeadLocalId: string) => {
      if (!activeDragId || activeDragId === targetHeadLocalId || !mergeDragEligible) return false;
      const ai = items.findIndex((r) => r.localId === activeDragId);
      const ti = items.findIndex((r) => r.localId === targetHeadLocalId);
      if (ai < 0 || ti < 0) return false;
      const aBid = items[ai]?.block_id?.trim() || null;
      const tBid = items[ti]?.block_id?.trim() || null;
      /* Same superset/circuit block: only reorder via sortable, never merge-on-drop (merge steals the pointer). */
      if (aBid && tBid && aBid === tBid) return false;
      return true;
    },
    [activeDragId, items, mergeDragEligible],
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

  /** PUT plan items (block_id / order / row types). Used by Save and after DnD merge/reorder. */
  const syncPlanItemsToApi = useCallback(
    async (normalized: WorkoutLine[], opts?: { silent?: boolean }) => {
      if (!planId || mode !== "training-plan") return false;
      if (validateWorkoutLinesSequence(normalized) !== null) return false;
      try {
        const res = await fetch(`${apiPrefix}/training-plans/${planId}/items`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(normalizeWorkoutLinesForApi(normalized)),
        });
        if (!res.ok) {
          message.error(await res.text());
          return false;
        }
        if (!opts?.silent) message.success(t("workouts.itemsSaved"));
        await invalidate({ resource: "training-plans", invalidates: ["detail"], id: String(planId) });
        return true;
      } catch {
        message.error(t("workouts.itemsSaveError"));
        return false;
      }
    },
    [invalidate, message, mode, planId, t],
  );

  /**
   * Re-index, validate (same rules as API), update local state. For training plans, also persists
   * grouping/order to the server so block membership is not only in memory.
   */
  const applyOrderedItems = useCallback(
    (next: WorkoutLine[]) => {
      const normalized = next.map((r, i) => ({ ...r, sort_order: i }));
      const err = validateWorkoutLinesSequence(normalized);
      if (err) {
        message.warning(t("workouts.invalidWorkoutOrder"));
        return null;
      }
      pushItems(normalized);
      if (planId && mode === "training-plan") void syncPlanItemsToApi(normalized, { silent: true });
      return normalized;
    },
    [message, mode, planId, pushItems, syncPlanItemsToApi, t],
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
    const ctx = pickerContextRef.current;
    setExercisePickerModalOpen(false);
    if (ctx.mode === "newSupersetSecond") {
      setPickerBanner({ mode: "newSupersetSecond", afterHeadLocalId: ctx.afterHeadLocalId });
      return;
    }
    pickerContextRef.current = { mode: "append" };
    setPickerBanner({ mode: "append" });
  }, []);

  const cancelIncompleteSuperset = useCallback(() => {
    pickerContextRef.current = { mode: "append" };
    setPickerBanner({ mode: "append" });
    setItems((prev) => {
      const cleaned = stripBlocksWithFewerThanTwoExercises(prev).map((r, i) => ({ ...r, sort_order: i }));
      if (validateWorkoutLinesSequence(cleaned) !== null) return prev;
      onChange?.(cleaned);
      return cleaned;
    });
  }, [onChange]);

  const armPickerContext = useCallback(
    (ctx: PickerContext) => {
      const prev = pickerContextRef.current;
      if (prev.mode === "newSupersetSecond" && ctx.mode !== "newSupersetSecond") {
        setItems((p) => {
          const cleaned = stripBlocksWithFewerThanTwoExercises(p).map((r, i) => ({ ...r, sort_order: i }));
          if (validateWorkoutLinesSequence(cleaned) !== null) return p;
          onChange?.(cleaned);
          return cleaned;
        });
      }
      pickerContextRef.current = ctx;
      setPickerBanner(ctx);
      setExercisePickerModalOpen(true);
    },
    [onChange],
  );

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
      if (ctx.mode === "extendBlock") {
        const next = insertLinkedExerciseAfter(items, ctx.afterIndex, ex);
        pushItems(next);
        pickerContextRef.current = { mode: "append" };
        setPickerBanner({ mode: "append" });
        return;
      }
      if (ctx.mode === "newSupersetFirst") {
        const bid = newLocalId();
        const bundle = newExerciseWithOneSetInBlock(ex, bid, "superset");
        const afterHeadLocalId = bundle[0]!.localId;
        pushItems([...items, ...bundle].map((r, i) => ({ ...r, sort_order: i })));
        pickerContextRef.current = { mode: "newSupersetSecond", afterHeadLocalId };
        setPickerBanner({ mode: "newSupersetSecond", afterHeadLocalId });
        return;
      }
      if (ctx.mode === "newSupersetSecond") {
        const afterIdx = items.findIndex((r) => r.localId === ctx.afterHeadLocalId);
        if (afterIdx < 0) return;
        const next = insertLinkedExerciseAfter(items, afterIdx, ex);
        pushItems(next);
        pickerContextRef.current = { mode: "append" };
        setPickerBanner({ mode: "append" });
        setExercisePickerModalOpen(false);
        return;
      }
      const next = [...items, ...newExerciseWithOneSet(ex)];
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
          applyOrderedItems(reorderWorkoutLinesByHeadMove(items, activeLocalId, overId));
        }
        return;
      }

      applyOrderedItems(reorderWorkoutLinesByHeadMove(items, activeLocalId, overId));
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
    const normalized = items.map((r, i) => ({ ...r, sort_order: i }));
    if (validateWorkoutLinesSequence(normalized) !== null) {
      message.warning(t("workouts.invalidWorkoutOrder"));
      return;
    }
    setSaving(true);
    try {
      await syncPlanItemsToApi(normalized, { silent: false });
    } finally {
      setSaving(false);
    }
  }, [items, message, planId, syncPlanItemsToApi, t]);

  return (
    <div className="workout-items-editor">
      <div style={{ marginBottom: 22 }}>
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                margin: "0 0 8px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--app-text-heading)",
              }}
            >
              {t("workouts.builderTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" component="span" style={{ marginBottom: 0, maxWidth: 520, fontSize: 14, lineHeight: 1.55 }}>
              {t("workouts.builderHint")}
            </Typography>
            {planVenue === "home" || planVenue === "commercial_gym" ? (
              <Typography variant="body2" color="text.secondary" component="span" style={{ display: "block", marginTop: 10, fontSize: 13 }}>
                {t("workouts.venueFilterHint", { venue: t(`workouts.venue.${planVenue}`) })}
              </Typography>
            ) : null}
          </div>
          {mode === "training-plan" && showSaveButton ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => void saveTrainingPlan()}
              disabled={saving}
              style={{ borderRadius: 12 }}
            >
              {t("workouts.saveItems")}
            </Button>
          ) : null}
        </Flex>
      </div>

      {items.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4, opacity: 0.85 }}>
          <Typography color="text.secondary">{t("workouts.emptyItems")}</Typography>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={workoutCollisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <Alert severity="info" className="workout-items-editor__dnd-tip" sx={{ mb: 2 }}>
            <AlertTitle>{t("workouts.dndGuideTitle")}</AlertTitle>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.55 }}>
              {t("workouts.dndGuideBody")}
            </Typography>
          </Alert>
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
                const exercisesInBlock = countExerciseBundlesInBlockSlice(items, start, end);
                nodes.push(
                  <div
                    key={bid}
                    style={{
                      marginBottom: 16,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid var(--app-border)",
                      borderLeft: `4px solid ${accent}`,
                      background: "color-mix(in srgb, var(--app-surface-elevated) 92%, transparent)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 36px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ padding: "16px 18px 14px" }}>
                      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={12} style={{ marginBottom: 14 }}>
                        <Flex vertical gap={10} style={{ minWidth: 0, flex: "1 1 240px" }}>
                          <Typography style={{ fontSize: 12, fontWeight: 600, color: "var(--app-text-muted)" }}>
                            {t("workouts.blockGroupLabel")}
                          </Typography>
                          <Flex align="center" gap={10} wrap="wrap">
                            <Select
                              size="small"
                              value={bt}
                              onChange={(e) => updateBlockType(bid, e.target.value as WorkoutBlockType)}
                              sx={{
                                minWidth: 200,
                                maxWidth: 300,
                                borderRadius: "12px",
                              }}
                            >
                              {BLOCK_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>
                                  {t(o.labelKey)}
                                </MenuItem>
                              ))}
                            </Select>
                            <Chip
                              size="small"
                              label={t("workouts.blockMemberCount", { count: exercisesInBlock })}
                              sx={{
                                margin: 0,
                                borderRadius: 999,
                                fontWeight: 600,
                                px: 1,
                                height: "auto",
                                py: 0.5,
                                background: `color-mix(in srgb, ${accent} 16%, var(--app-surface-elevated))`,
                                color: "var(--app-text-heading)",
                              }}
                            />
                          </Flex>
                        </Flex>
                        <Tooltip title={t("workouts.blockDragBundleHint")}>
                          <IconButton size="small" sx={{ color: "var(--app-text-muted)" }} aria-label={t("workouts.blockDragBundleHint")}>
                            <HelpOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Flex>
                      {(() => {
                      const dividerStyle: CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        margin: "14px 0 12px",
                      };
                      let k = 0;
                      let bundleOrdinal = 0;
                      const blockChildren: ReactNode[] = [];
                      while (k < blockLen) {
                        const globalIndex = start + k;
                        const [lo, hi] = exerciseGroupRange(items, globalIndex);
                        bundleOrdinal += 1;
                        /* Capture per bundle: SortableExerciseGroup calls this fn later, so `bundleOrdinal` alone would be stale (last loop value for every card). */
                        const stepIndexForBundle = bundleOrdinal;
                        const totalStepsForBlock = exercisesInBlock;
                        blockChildren.push(
                          <Fragment key={`ex-in-block-${items[lo].localId}`}>
                            {lo > start ? (
                              <div style={dividerStyle}>
                                <div style={{ flex: 1, height: 1, background: "var(--app-border)" }} />
                                <span aria-hidden style={{ color: accent, fontSize: 12, opacity: 0.85, padding: "0 4px" }}>
                                  ↓
                                </span>
                                <div style={{ flex: 1, height: 1, background: "var(--app-border)" }} />
                              </div>
                            ) : null}
                            <SortableExerciseGroup
                              headLocalId={items[lo].localId}
                              shellStyle={exerciseCardShellInBlock(accent)}
                              mergeDropEnabled={mergeDropActiveForHead(items[lo].localId)}
                              activeDragHeadId={activeDragId}
                            >
                              {(drag) => (
                                <>
                                  {Array.from({ length: hi - lo + 1 }, (_, d) => {
                                    const idx = lo + d;
                                    const r = items[idx];
                                    const stepLabel = t("workouts.blockMemberStep", {
                                      current: stepIndexForBundle,
                                      total: totalStepsForBlock,
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
                    </div>
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
                  padding: "16px 18px",
                  minWidth: 288,
                  maxWidth: 440,
                  borderRadius: 16,
                  background: "var(--app-surface-elevated)",
                  border: "1px solid var(--app-border-strong)",
                  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.18), 0 0 0 1px color-mix(in srgb, var(--app-accent) 12%, transparent)",
                  cursor: "grabbing",
                }}
              >
                {activeDragBundleRows.length > 1 ? (
                  <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                    {t("workouts.dragBundleTogether", { count: activeDragBundleRows.length })}
                  </Typography>
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
                          borderTop: bi ? "1px solid var(--app-border)" : undefined,
                        }}
                      >
                        {showSetTag ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
                            <Chip size="small" label={t("workouts.setNumber", { n })} sx={{ m: 0 }} />
                            <Typography fontWeight={600} sx={{ fontSize: 14 }} noWrap title={name}>
                              {name}
                            </Typography>
                          </Stack>
                        ) : (
                          <>
                            <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                              {t("workouts.colExerciseBlock")}
                            </Typography>
                            <Typography fontWeight={600} sx={{ fontSize: 15 }} noWrap title={name}>
                              {name}
                            </Typography>
                          </>
                        )}
                      </div>
                    );
                  });
                })()}
                <Divider style={{ margin: "12px 0 8px" }} />
                <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 11, display: "block", lineHeight: 1.5 }}>
                  {t("workouts.dragOverlayHints")}
                </Typography>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!exercisePickerModalOpen && pickerBanner.mode !== "append" ? (
        <Alert
          severity="info"
          className="workout-items-editor__banner"
          sx={{ mt: 2.5 }}
          action={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {pickerBanner.mode === "newSupersetSecond" ? (
                <Button size="small" onClick={cancelIncompleteSuperset}>
                  {t("workouts.cancelSupersetDraft")}
                </Button>
              ) : null}
              <Button size="small" variant="contained" color="primary" onClick={() => setExercisePickerModalOpen(true)}>
                {t("workouts.openExerciseLibrary")}
              </Button>
            </Stack>
          }
        >
          {pickerBanner.mode === "newSupersetSecond"
            ? t("workouts.pickerCollapsedSupersetHint")
            : t("workouts.pickerCollapsedLinkHint")}
        </Alert>
      ) : null}

      <Flex vertical gap={10} style={{ width: "100%", marginTop: 20 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          startIcon={<AddIcon />}
          onClick={() => armPickerContext({ mode: "append" })}
          style={{ borderRadius: 12, height: 46, fontWeight: 600 }}
        >
          {t("workouts.addExercise")}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<LinkIcon />}
          onClick={() => armPickerContext({ mode: "newSupersetFirst" })}
          style={{
            borderRadius: 12,
            height: 46,
            fontWeight: 600,
            borderColor: "var(--app-border-strong)",
            background: "var(--app-surface-elevated)",
          }}
        >
          {t("workouts.addSuperset")}
        </Button>
      </Flex>

      <Dialog
        open={exercisePickerModalOpen}
        onClose={closeExercisePickerModal}
        maxWidth="sm"
        fullWidth
        className="workout-items-editor__modal"
        PaperProps={{ sx: { borderRadius: "16px", maxHeight: "min(78vh, 640px)" } }}
      >
        <DialogTitle>
          <Typography
            variant="h5"
            component="span"
            sx={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--app-text-heading)" }}
          >
            {t("workouts.pickExercise")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: 13, lineHeight: 1.5 }}>
            {t("workouts.pickerModalSubtitle")}
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
        <div
          id="workout-exercise-bank"
          style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
        >
          <Typography variant="body2" color="text.secondary" component="span" style={{ marginBottom: 12 }}>
            {t("workouts.exerciseBankIntro")}
          </Typography>
          {pickerBanner.mode === "extendBlock" ? (
            <Alert
              severity="info"
              className="workout-items-editor__banner"
              sx={{ mb: 1.5 }}
              action={
                <Button size="small" onClick={() => armPickerContext({ mode: "append" })}>
                  {t("workouts.pickerClearMode")}
                </Button>
              }
            >
              {t("workouts.pickerActiveExtendBlock")}
            </Alert>
          ) : null}
          {pickerBanner.mode === "newSupersetFirst" ? (
            <Alert
              severity="info"
              className="workout-items-editor__banner"
              sx={{ mb: 1.5 }}
              action={
                <Button size="small" onClick={() => armPickerContext({ mode: "append" })}>
                  {t("workouts.pickerClearMode")}
                </Button>
              }
            >
              {t("workouts.pickerActiveSupersetFirst")}
            </Alert>
          ) : null}
          {pickerBanner.mode === "newSupersetSecond" ? (
            <Alert
              severity="warning"
              className="workout-items-editor__banner"
              sx={{ mb: 1.5 }}
              action={
                <Button size="small" onClick={cancelIncompleteSuperset}>
                  {t("workouts.cancelSupersetDraft")}
                </Button>
              }
            >
              {t("workouts.pickerActiveSupersetSecond")}
            </Alert>
          ) : null}
          {pickerBanner.mode === "append" ? (
            <Typography variant="body2" color="text.secondary" component="span" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
              {t("workouts.pickerActiveAppend")}
            </Typography>
          ) : null}
          {pickerLoading && catalogOpts.length === 0 && mineOpts.length === 0 ? (
            <Flex align="center" justify="center" style={{ minHeight: 160 }}>
              <CircularProgress />
            </Flex>
          ) : (
            <Stack spacing={2} sx={{ width: "100%", flex: 1, minHeight: 0 }}>
              <Flex wrap="wrap" gap={8} align="center" justify="space-between">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={pickerScope}
                  onChange={(_, v) => v != null && setPickerScope(v as "all" | "mine" | "catalog")}
                >
                  <ToggleButton value="all">{t("workouts.pickerScopeAll")}</ToggleButton>
                  <ToggleButton value="mine">{t("workouts.pickerScopeMine")}</ToggleButton>
                  <ToggleButton value="catalog">{t("workouts.pickerScopeCatalog")}</ToggleButton>
                </ToggleButtonGroup>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => armPickerContext({ mode: "append" })}
                >
                  {t("workouts.addToEnd")}
                </Button>
              </Flex>
              <TextField
                size="small"
                fullWidth
                placeholder={t("workouts.pickerFilterPh")}
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 12 }}>
                  {t("workouts.pickerHint")}
                </Typography>
                {pickerTotal > 0 ? (
                  <Typography variant="body2" color="text.secondary" component="span" style={{ fontSize: 12 }}>
                    {t("workouts.pickerShowingCount", { count: pickerTotal })}
                  </Typography>
                ) : null}
              </Flex>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: 380,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  paddingInlineEnd: 4,
                }}
                onWheel={(e) => e.stopPropagation()}
              >
                {pickerTotal === 0 && !pickerLoading ? (
                  <Box sx={{ textAlign: "center", py: 3, opacity: 0.85 }}>
                    <Typography color="text.secondary">{t("workouts.pickerNoMatches")}</Typography>
                  </Box>
                ) : pickerTotal === 0 && pickerLoading ? (
                  <Flex justify="center" style={{ padding: 24 }}>
                    <CircularProgress />
                  </Flex>
                ) : (
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
                    {pickerLists.mine.length > 0 ? (
                      <>
                        <Typography fontWeight={600} sx={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupMine")}
                        </Typography>
                        {pickerLists.mine.map((ex) => (
                          <Flex
                            key={`mine-${ex.id}`}
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            className="workout-items-editor__picker-row"
                          >
                            <Flex align="center" gap={10} style={{ minWidth: 0, flex: "1 1 200px" }}>
                              <Typography noWrap title={ex.name} sx={{ m: 0 }}>
                                {ex.name}
                              </Typography>
                              <Chip
                                size="small"
                                color="success"
                                label={t("workouts.pickerTagMine")}
                                sx={{ m: 0, fontSize: 11, height: 22, flexShrink: 0 }}
                              />
                            </Flex>
                            <Button
                              variant="contained" color="primary"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => addExerciseFromPicker(ex)}
                              style={{ borderRadius: 10 }}
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
                        <Typography fontWeight={600} sx={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupCatalog")}
                        </Typography>
                        {pickerLists.catalog.map((ex) => (
                          <Flex
                            key={`cat-${ex.id}`}
                            align="center"
                            justify="space-between"
                            gap={12}
                            wrap="wrap"
                            className="workout-items-editor__picker-row"
                          >
                            <Flex align="center" gap={10} style={{ minWidth: 0, flex: "1 1 200px" }}>
                              <Typography noWrap title={ex.name} sx={{ m: 0 }}>
                                {ex.name}
                              </Typography>
                              <Chip
                                size="small"
                                color="info"
                                label={t("workouts.pickerBadgeCatalog")}
                                sx={{ m: 0, fontSize: 11, height: 22, flexShrink: 0 }}
                              />
                            </Flex>
                            <Button
                              variant="contained" color="primary"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => addExerciseFromPicker(ex)}
                              style={{ borderRadius: 10 }}
                            >
                              {t("workouts.pickerAddExercise")}
                            </Button>
                          </Flex>
                        ))}
                      </>
                    ) : null}
                  </Stack>
                )}
              </div>
            </Stack>
          )}
        </div>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
          <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
            <Button disabled={pickerLoading} onClick={() => void loadExerciseOptions()} sx={{ borderRadius: "10px" }}>
              {t("workouts.exerciseBankRefresh")}
            </Button>
            <Button component={Link} to="/exercises/create" variant="text" sx={{ px: 0.5 }}>
              {t("workouts.quickCreateExercise")}
            </Button>
          </Stack>
          <Button variant="contained" color="primary" onClick={closeExercisePickerModal} sx={{ borderRadius: "10px" }}>
            {t("workouts.pickerDone")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mergeModal != null}
        onClose={() => setMergeModal(null)}
        className="workout-items-editor__modal"
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle>{t("workouts.mergeModalTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("workouts.mergeModalHint")}
          </Typography>
          <Select
            fullWidth
            size="small"
            value={mergePickType}
            onChange={(e) => setMergePickType(e.target.value as WorkoutBlockType)}
            sx={{ borderRadius: "12px" }}
          >
            {BLOCK_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeModal(null)}>{t("actions.cancel")}</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (!mergeModal) return;
              const committed = applyOrderedItems(
                mergeExerciseBundleAfterTarget(
                  items,
                  mergeModal.activeLocalId,
                  mergeModal.targetLocalId,
                  mergePickType,
                ),
              );
              if (committed !== null) setMergeModal(null);
            }}
          >
            {t("workouts.mergeModalOk")}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}
