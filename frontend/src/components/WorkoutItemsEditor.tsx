import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
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
  newExerciseWithOneSet,
  newExerciseWithOneSetInBlock,
  newLocalId,
  normalizeWorkoutLinesForApi,
  orderedExerciseHeadLocalIds,
  reorderWorkoutLinesByHeadMove,
  setOrdinalInGroup,
  setRowUISegment,
  stripBlocksWithFewerThanTwoExercises,
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
                                  showAdvanced={effectiveShowAdvanced}
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
                                startIcon={<LinkOffIcon fontSize="small" />}
                                onClick={() => ungroupBlockById(bid)}
                                sx={{
                                  color: "text.secondary",
                                  fontWeight: 500,
                                  textTransform: "none",
                                  minHeight: 30,
                                  px: 1.25,
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
                                          showAdvanced={effectiveShowAdvanced}
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
        onCancelSupersetDraft={cancelIncompleteSuperset}
        onRefresh={() => void loadExerciseOptions()}
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
