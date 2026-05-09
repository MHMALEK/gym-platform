import { ChevronDown, ChevronRight, Layers, Plus, Unlink } from "lucide-react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useInvalidate } from "@refinedev/core";
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
import { useAppMessage } from "../lib/useAppMessage";
import { WorkoutFlex as Flex } from "./WorkoutFlex";
import { AddSetBelowFooter } from "./workout-builder/AddSetBelowFooter";
import { loadExercisesGrouped } from "./workout-builder/api";
import {
  BLOCK_OPTIONS,
  MERGE_INTO_PREFIX,
  mergeIntoDroppableId,
} from "./workout-builder/constants";
import { workoutCollisionDetection } from "./workout-builder/dnd";
import { ExercisePickerModal } from "./workout-builder/ExercisePickerModal";
import {
  blockAccent,
  contiguousBlockRange,
  countExerciseBundlesInBlockSlice,
  legacyRowUISegment,
  reorderWithBlocks,
} from "./workout-builder/helpers";
import { MergeBlockModal } from "./workout-builder/MergeBlockModal";
import { SortableExerciseGroup } from "./workout-builder/SortableExerciseGroup";
import {
  exerciseCardShellInBlock,
  exerciseGroupShellStyle,
} from "./workout-builder/styles";
import type {
  ExerciseOpt,
  PickerContext,
  RowPresentation,
  WorkoutItemsEditorProps,
} from "./workout-builder/types";
import { WorkoutRow } from "./workout-builder/WorkoutRow";
import {
  type WorkoutBlockType,
  type WorkoutLine,
  exerciseGroupRange,
  insertLinkedExerciseAfter,
  insertSetBelowGroupEnd,
  isBundleHeadRow,
  isMergeDragRoot,
  isWorkoutLineSetLikeRow,
  mergeExerciseBundleAfterTarget,
  createBlockFromExercises,
  newExerciseWithOneSet,
  newLocalId,
  normalizeWorkoutLinesForApi,
  orderedExerciseHeadLocalIds,
  reorderWorkoutLinesByHeadMove,
  setOrdinalInGroup,
  setRowUISegment,
  ungroupBlock,
  validateWorkoutLinesSequence,
} from "../lib/workoutLineModel";

export type { WorkoutBlockType, WorkoutLine } from "../lib/workoutLineModel";
export { normalizeWorkoutLinesForApi as normalizeWorkoutItemsForApi, workoutLinesFromApiItems } from "../lib/workoutLineModel";


export function WorkoutItemsEditor({
  mode,
  planId,
  planVenue,
  initialItems,
  showSaveButton = true,
  hideHeader = false,
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
  /** Show RPE / weight / tempo inputs. Persisted across sessions; auto-on if any line uses these fields. */
  const [showAdvancedFields, setShowAdvancedFields] = useState<boolean>(() => {
    try {
      return localStorage.getItem("workouts.showAdvancedFields") === "1";
    } catch {
      return false;
    }
  });
  const setShowAdvancedFieldsPersisted = useCallback((next: boolean) => {
    setShowAdvancedFields(next);
    try {
      localStorage.setItem("workouts.showAdvancedFields", next ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, []);
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

  /** Auto-enable advanced columns when any line already uses them — never hide existing data. */
  const itemsHaveAdvanced = useMemo(
    () =>
      items.some(
        (it) =>
          it.weight_kg != null ||
          it.rpe != null ||
          (it.tempo != null && it.tempo !== ""),
      ),
    [items],
  );
  const effectiveShowAdvanced = showAdvancedFields || itemsHaveAdvanced;

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
        if (!opts?.silent) {
          message.success(t("workouts.itemsSaved"));
          // Only invalidate on explicit saves — auto-save invalidation would
          // race with in-progress edits and clobber unsaved local changes.
          await invalidate({ resource: "training-plans", invalidates: ["detail"], id: String(planId) });
        }
        return true;
      } catch {
        message.error(t("workouts.itemsSaveError"));
        return false;
      }
    },
    [invalidate, message, mode, planId, t],
  );

  /** Debounced auto-save: persists every local edit (input changes, add/remove
   *  exercise, add set, etc.) ~800ms after the last change. Without this,
   *  pushItems would only update React state and edits would vanish on reload. */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushItems = useCallback(
    (next: WorkoutLine[]) => {
      setItems(next);
      onChange?.(next);
      if (planId && mode === "training-plan") {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          void syncPlanItemsToApi(next, { silent: true });
        }, 800);
      }
    },
    [mode, onChange, planId, syncPlanItemsToApi],
  );

  // Clear pending auto-save on unmount so a stale timer doesn't fire.
  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    },
    [],
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

  /** Selection used when the picker is in `groupSelect` mode (multi-pick to create a new block). */
  const [groupSelected, setGroupSelected] = useState<ExerciseOpt[]>([]);
  const [groupBlockType, setGroupBlockType] = useState<WorkoutBlockType>("superset");

  /** Block IDs the user has collapsed in the current session (in-memory only). */
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const toggleBlockCollapsed = useCallback((blockId: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  /** Standalone exercise heads (by head localId) the user has collapsed — hides set rows. */
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(new Set());
  const toggleExerciseCollapsed = useCallback((headLocalId: string) => {
    setCollapsedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(headLocalId)) next.delete(headLocalId);
      else next.add(headLocalId);
      return next;
    });
  }, []);

  /** Set rows the user has explicitly opened to override head defaults.
   *  Without this, set rows render only the chip + trash; inputs stay
   *  hidden because they'd just duplicate the exercise head's values. */
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const toggleSetExpanded = useCallback((rowLocalId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(rowLocalId)) next.delete(rowLocalId);
      else next.add(rowLocalId);
      return next;
    });
  }, []);

  const closeExercisePickerModal = useCallback(() => {
    setExercisePickerModalOpen(false);
    pickerContextRef.current = { mode: "append" };
    setPickerBanner({ mode: "append" });
    setGroupSelected([]);
  }, []);

  const armPickerContext = useCallback((ctx: PickerContext) => {
    pickerContextRef.current = ctx;
    setPickerBanner(ctx);
    if (ctx.mode !== "groupSelect") {
      setGroupSelected([]);
    }
    setExercisePickerModalOpen(true);
  }, []);

  const toggleGroupSelected = useCallback((ex: ExerciseOpt) => {
    setGroupSelected((prev) => {
      const exists = prev.some((p) => p.id === ex.id && p.source === ex.source);
      if (exists) return prev.filter((p) => !(p.id === ex.id && p.source === ex.source));
      return [...prev, ex];
    });
  }, []);

  const commitGroupSelection = useCallback(() => {
    if (groupSelected.length < 2) return;
    pushItems(createBlockFromExercises(items, groupSelected, groupBlockType));
    setGroupSelected([]);
    pickerContextRef.current = { mode: "append" };
    setPickerBanner({ mode: "append" });
    setExercisePickerModalOpen(false);
  }, [groupBlockType, groupSelected, items, pushItems]);

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
      // Default + groupSelect "single add" both fall through to append; groupSelect uses
      // toggleGroupSelected + commitGroupSelection for the multi-pick path.
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

  const ungroupBlockById = useCallback(
    (blockId: string) => {
      pushItems(ungroupBlock(items, blockId));
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

  const advancedToggle = (
    <Tooltip
      title={
        t("workouts.toggleAdvancedHint") !== "workouts.toggleAdvancedHint"
          ? t("workouts.toggleAdvancedHint")
          : "Show RPE, weight (kg) and tempo inputs on every set"
      }
      placement="top"
    >
      <span>
        <Button
          size="small"
          variant={effectiveShowAdvanced ? "outlined" : "text"}
          color="inherit"
          onClick={() => setShowAdvancedFieldsPersisted(!showAdvancedFields)}
          disabled={itemsHaveAdvanced && !showAdvancedFields}
          sx={{
            color: "text.secondary",
            borderRadius: 2,
            fontWeight: 500,
            minHeight: 32,
            px: 1.5,
            "&.Mui-disabled": { color: "text.disabled" },
          }}
        >
          {effectiveShowAdvanced
            ? t("workouts.hideAdvanced") !== "workouts.hideAdvanced"
              ? t("workouts.hideAdvanced")
              : "Hide advanced"
            : t("workouts.showAdvanced") !== "workouts.showAdvanced"
              ? t("workouts.showAdvanced")
              : "Show advanced"}
        </Button>
      </span>
    </Tooltip>
  );

  const saveButton =
    mode === "training-plan" && showSaveButton ? (
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
    ) : null;

  return (
    <div className="workout-items-editor">
      {hideHeader ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 2 }}
        >
          {planVenue === "home" || planVenue === "commercial_gym" ? (
            <Typography variant="caption" color="text.secondary">
              {t("workouts.venueFilterHint", { venue: t(`workouts.venue.${planVenue}`) })}
            </Typography>
          ) : (
            <span aria-hidden />
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            {advancedToggle}
            {saveButton}
          </Stack>
        </Stack>
      ) : (
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
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                style={{ marginBottom: 0, maxWidth: 520, fontSize: 14, lineHeight: 1.55 }}
              >
                {t("workouts.builderHint")}
              </Typography>
              {planVenue === "home" || planVenue === "commercial_gym" ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                  style={{ display: "block", marginTop: 10, fontSize: 13 }}
                >
                  {t("workouts.venueFilterHint", { venue: t(`workouts.venue.${planVenue}`) })}
                </Typography>
              ) : null}
            </div>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              {advancedToggle}
              {saveButton}
            </Stack>
          </Flex>
        </div>
      )}

      {items.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 5,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            borderStyle: "dashed",
          }}
        >
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            {t("workouts.emptyItems")}
          </Typography>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={workoutCollisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext items={sortableHeadIds} strategy={verticalListSortingStrategy}>
            {(() => {
              const nodes: ReactNode[] = [];
              let i = 0;
              while (i < items.length) {
                const row = items[i];
                if (!row.block_id) {
                  const [lo, hi] = exerciseGroupRange(items, i);
                  const headLocalId = items[lo].localId;
                  const isCollapsed = collapsedExercises.has(headLocalId);
                  nodes.push(
                    <SortableExerciseGroup
                      key={`exercise-group-${headLocalId}`}
                      headLocalId={headLocalId}
                      shellStyle={exerciseGroupShellStyle}
                      mergeDropEnabled={mergeDropActiveForHead(headLocalId)}
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
                            // Hide everything below the head when this exercise is collapsed.
                            if (isCollapsed && presentation !== "exercise_head") {
                              return null;
                            }
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
                                  showAdvanced={effectiveShowAdvanced}
                                  collapsed={
                                    presentation === "exercise_head" ? isCollapsed : undefined
                                  }
                                  onToggleCollapsed={
                                    presentation === "exercise_head"
                                      ? () => toggleExerciseCollapsed(headLocalId)
                                      : undefined
                                  }
                                  expanded={
                                    presentation === "set_under"
                                      ? expandedSets.has(r.localId)
                                      : undefined
                                  }
                                  onToggleExpanded={
                                    presentation === "set_under"
                                      ? () => toggleSetExpanded(r.localId)
                                      : undefined
                                  }
                                  t={t}
                                  updateAt={updateAt}
                                  removeAt={removeAt}
                                />
                              </Fragment>
                            );
                          })}
                          {isCollapsed ? null : (
                            <AddSetBelowFooter
                              onClick={() => addSetBelow(hi)}
                              label={t("workouts.addSetBelow")}
                            />
                          )}
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
                      marginBottom: 12,
                      borderLeft: `3px solid ${accent}`,
                      paddingLeft: 10,
                      background: "transparent",
                    }}
                  >
                    <div style={{ padding: "0 0 4px 0" }}>
                      <Flex align="center" wrap="wrap" gap={8} style={{ marginBottom: collapsedBlocks.has(bid) ? 0 : 6 }}>
                        <Tooltip
                          title={
                            collapsedBlocks.has(bid)
                              ? t("workouts.expandBlock") !== "workouts.expandBlock"
                                ? t("workouts.expandBlock")
                                : "Expand"
                              : t("workouts.collapseBlock") !== "workouts.collapseBlock"
                                ? t("workouts.collapseBlock")
                                : "Collapse"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => toggleBlockCollapsed(bid)}
                            aria-label={collapsedBlocks.has(bid) ? "Expand block" : "Collapse block"}
                            sx={{
                              p: 0.5,
                              color: "text.secondary",
                              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                            }}
                          >
                            {collapsedBlocks.has(bid) ? (
                              <ChevronRight size={18} strokeWidth={2} />
                            ) : (
                              <ChevronDown size={18} strokeWidth={2} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: accent,
                            flexShrink: 0,
                          }}
                        />
                        <Select
                          size="small"
                          value={bt}
                          onChange={(e) => updateBlockType(bid, e.target.value as WorkoutBlockType)}
                          sx={{
                            minWidth: 140,
                            borderRadius: "10px",
                            "& .MuiSelect-select": { py: 0.75 },
                          }}
                        >
                          {BLOCK_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {t(o.labelKey)}
                            </MenuItem>
                          ))}
                        </Select>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 12 }}
                        >
                          {t("workouts.blockMemberCount", { count: exercisesInBlock })}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip
                          title={
                            t("workouts.ungroupBlockHint") !== "workouts.ungroupBlockHint"
                              ? t("workouts.ungroupBlockHint")
                              : "Detach all exercises from this block"
                          }
                        >
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            startIcon={<Unlink size={14} />}
                            onClick={() => ungroupBlockById(bid)}
                            sx={{
                              color: "text.secondary",
                              fontWeight: 500,
                              textTransform: "none",
                              minHeight: 28,
                              px: 1,
                              borderRadius: 1.5,
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            {t("workouts.ungroupBlock") !== "workouts.ungroupBlock"
                              ? t("workouts.ungroupBlock")
                              : "Ungroup"}
                          </Button>
                        </Tooltip>
                      </Flex>
                      {!collapsedBlocks.has(bid) && (() => {
                      const dividerStyle: CSSProperties = {
                        height: 1,
                        background: "var(--app-border)",
                        margin: "6px 0",
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
                            {lo > start ? <div aria-hidden style={dividerStyle} /> : null}
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
                                          showAdvanced={effectiveShowAdvanced}
                                          expanded={
                                            presentation === "set_under"
                                              ? expandedSets.has(r.localId)
                                              : undefined
                                          }
                                          onToggleExpanded={
                                            presentation === "set_under"
                                              ? () => toggleSetExpanded(r.localId)
                                              : undefined
                                          }
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

      {/* Add toolbar at the bottom of the list — primary "Add exercise" + secondary
          "Add superset". Breathing room above + a subtle top divider so the toolbar
          doesn't look glued onto the last set row. */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          width: "100%",
          mt: 4,
          pt: 3,
          borderTop: 1,
          borderColor: "divider",
          alignItems: "center",
          flexWrap: "wrap",
        }}
        useFlexGap
      >
        <Button
          variant="contained"
          color="primary"
          size="medium"
          startIcon={<Plus size={16} strokeWidth={2.25} />}
          onClick={() => armPickerContext({ mode: "append" })}
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            px: 2,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          }}
        >
          {t("workouts.addExercise")}
        </Button>
        <Button
          variant="outlined"
          size="medium"
          startIcon={<Layers size={16} strokeWidth={2.25} />}
          onClick={() => armPickerContext({ mode: "groupSelect" })}
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            textTransform: "none",
            color: "text.secondary",
            borderColor: "divider",
            px: 1.75,
            "&:hover": {
              color: "primary.main",
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
        >
          {t("workouts.addSuperset")}
        </Button>
      </Stack>

      {!exercisePickerModalOpen && pickerBanner.mode === "extendBlock" ? (
        <Alert
          severity="info"
          className="workout-items-editor__banner"
          sx={{ mt: 2 }}
          action={
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => setExercisePickerModalOpen(true)}
            >
              {t("workouts.openExerciseLibrary")}
            </Button>
          }
        >
          {t("workouts.pickerCollapsedLinkHint")}
        </Alert>
      ) : null}

      <ExercisePickerModal
        open={exercisePickerModalOpen}
        onClose={closeExercisePickerModal}
        loading={pickerLoading}
        catalogOptsLoaded={catalogOpts.length > 0 || mineOpts.length > 0}
        banner={pickerBanner}
        scope={pickerScope}
        setScope={setPickerScope}
        query={pickerQuery}
        setQuery={setPickerQuery}
        lists={pickerLists}
        total={pickerTotal}
        onAddExercise={addExerciseFromPicker}
        onResetMode={() => armPickerContext({ mode: "append" })}
        onRefresh={() => void loadExerciseOptions()}
        groupSelected={groupSelected}
        onToggleGroupSelected={toggleGroupSelected}
        groupBlockType={groupBlockType}
        setGroupBlockType={setGroupBlockType}
        onCommitGroupSelection={commitGroupSelection}
        t={t}
      />

      <MergeBlockModal
        open={mergeModal != null}
        pickType={mergePickType}
        setPickType={setMergePickType}
        onCancel={() => setMergeModal(null)}
        onConfirm={() => {
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
        t={t}
      />

    </div>
  );
}
