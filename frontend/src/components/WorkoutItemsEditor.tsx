import {
  DeleteOutlined,
  DownOutlined,
  HolderOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
  App,
  Button,
  Dropdown,
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
import { Fragment, type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
};

type ExerciseOpt = { id: number; name: string; source: "catalog" | "mine" };

function newLocalId() {
  return crypto.randomUUID();
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

function blockAccent(blockId: string): string {
  let h = 0;
  for (let i = 0; i < blockId.length; i++) h = (h * 31 + blockId.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 52%)`;
}

/** Adjacent singles only — avoids corrupting existing blocks; unlink first if needed. */
function canPairBelow(items: WorkoutLine[], index: number): boolean {
  if (index >= items.length - 1) return false;
  const a = items[index];
  const b = items[index + 1];
  return !a.block_id && !b.block_id;
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

function BlockInsertBar({
  afterIndex,
  pairWithNextTyped,
  t,
}: {
  afterIndex: number;
  pairWithNextTyped: (index: number, bt: WorkoutBlockType) => void;
  t: (k: string) => string;
}) {
  const menuItems = BLOCK_OPTIONS.map((o) => ({
    key: o.value,
    label: t(o.labelKey),
  }));
  return (
    <div style={{ margin: "4px 0 12px", paddingInlineStart: 36 }}>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: menuItems,
          onClick: ({ key }) => pairWithNextTyped(afterIndex, key as WorkoutBlockType),
        }}
      >
        <Button type="dashed" block size="small" icon={<PlusOutlined />}>
          {t("workouts.pairRowBelowMenu")}{" "}
          <DownOutlined style={{ fontSize: 11, opacity: 0.72 }} />
        </Button>
      </Dropdown>
    </div>
  );
}

function SortableRow({
  row,
  index,
  itemsLen,
  prevBlockId,
  insideBlock,
  t,
  updateAt,
  removeAt,
  joinPrevious,
  leaveGroup,
  updateBlockType,
}: {
  row: WorkoutLine;
  index: number;
  itemsLen: number;
  prevBlockId: string | null | undefined;
  insideBlock: boolean;
  t: (k: string) => string;
  updateAt: (i: number, patch: Partial<WorkoutLine>) => void;
  removeAt: (i: number) => void;
  joinPrevious: (i: number) => void;
  leaveGroup: (i: number) => void;
  updateBlockType: (blockId: string, bt: WorkoutBlockType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.localId,
  });
  const rowStripe =
    insideBlock || !row.block_id
      ? "4px solid transparent"
      : `4px solid ${blockAccent(row.block_id)}`;
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    borderLeft: rowStripe,
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: insideBlock ? 0 : 8,
    background: "var(--app-surface-elevated, #1a2234)",
    borderRadius: 8,
    border: "1px solid var(--app-border, rgba(148,163,184,0.16))",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Space wrap align="start" style={{ width: "100%" }} size={[8, 8]}>
        <Button type="text" size="small" icon={<HolderOutlined />} {...attributes} {...listeners} />
        <div style={{ minWidth: 128 }}>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
            {t("workouts.colBlock")}
          </Typography.Text>
          {row.block_id ? (
            <Select<WorkoutBlockType>
              size="small"
              style={{ width: "100%" }}
              value={row.block_type ?? "superset"}
              options={BLOCK_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              onChange={(bt) => updateBlockType(row.block_id!, bt)}
            />
          ) : (
            <Typography.Text type="secondary">{t("workouts.block.single")}</Typography.Text>
          )}
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 140 }}>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
            {t("workouts.colExercise")}
          </Typography.Text>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {row.exercise_name ?? `ID ${row.exercise_id}`}
          </Typography.Text>
        </div>
        <InputNumber
          min={0}
          size="small"
          style={{ width: 72 }}
          placeholder={t("workouts.colSets")}
          value={row.sets ?? undefined}
          onChange={(v) => updateAt(index, { sets: v == null ? null : Number(v) })}
        />
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
          <Button
            size="small"
            disabled={index === 0 || !prevBlockId}
            onClick={() => joinPrevious(index)}
          >
            {t("workouts.joinPrevious")}
          </Button>
          <Button size="small" disabled={!row.block_id} onClick={() => leaveGroup(index)}>
            {t("workouts.leaveGroup")}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAt(index)} />
        </Space>
      </Space>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [catalogOpts, setCatalogOpts] = useState<ExerciseOpt[]>([]);
  const [mineOpts, setMineOpts] = useState<ExerciseOpt[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerScope, setPickerScope] = useState<"all" | "mine" | "catalog">("all");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const venueCompat = useMemo(() => {
    if (planVenue === "home" || planVenue === "commercial_gym") return planVenue;
    return undefined;
  }, [planVenue]);

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

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerQuery("");
    setPickerScope("all");
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
      const next = [
        ...items,
        {
          localId: newLocalId(),
          exercise_id: ex.id,
          sort_order: items.length,
          sets: 3,
          reps: 10,
          duration_sec: null,
          rest_sec: 60,
          notes: null,
          exercise_name: ex.name,
          block_id: null,
          block_type: null,
        },
      ];
      pushItems(next);
    },
    [items, pushItems],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((x) => x.localId === active.id);
      const newIndex = items.findIndex((x) => x.localId === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      pushItems(reorderWithBlocks(items, oldIndex, newIndex));
    },
    [items, pushItems],
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

  const pairWithNext = useCallback(
    (index: number, blockType: WorkoutBlockType = "superset") => {
      if (!canPairBelow(items, index)) return;
      const bid = newLocalId();
      const next = items.map((row, i) => {
        if (i === index || i === index + 1) return { ...row, block_id: bid, block_type: blockType };
        return row;
      });
      pushItems(next);
    },
    [items, pushItems],
  );

  const joinPrevious = useCallback(
    (index: number) => {
      if (index === 0) return;
      const prev = items[index - 1];
      if (!prev.block_id) return;
      const next = items.map((row, i) =>
        i === index ? { ...row, block_id: prev.block_id, block_type: prev.block_type } : row,
      );
      pushItems(next);
    },
    [items, pushItems],
  );

  const leaveGroup = useCallback(
    (index: number) => {
      updateAt(index, { block_id: null, block_type: null });
    },
    [updateAt],
  );

  const updateBlockType = useCallback(
    (blockId: string, bt: WorkoutBlockType) => {
      const next = items.map((row) => (row.block_id === blockId ? { ...row, block_type: bt } : row));
      pushItems(next);
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => void openPicker()}>
          {t("workouts.addExercise")}
        </Button>
        {mode === "training-plan" && showSaveButton ? (
          <Button onClick={() => void saveTrainingPlan()} loading={saving}>
            {t("workouts.saveItems")}
          </Button>
        ) : null}
      </Space>

      {items.length === 0 ? (
        <Typography.Text type="secondary">{t("workouts.emptyItems")}</Typography.Text>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((r) => r.localId)} strategy={verticalListSortingStrategy}>
            {(() => {
              const nodes: ReactNode[] = [];
              let i = 0;
              while (i < items.length) {
                const row = items[i];
                if (!row.block_id) {
                  const idx = i;
                  nodes.push(
                    <Fragment key={row.localId}>
                      <SortableRow
                        row={row}
                        index={idx}
                        itemsLen={items.length}
                        prevBlockId={idx > 0 ? items[idx - 1]?.block_id : null}
                        insideBlock={false}
                        t={t}
                        updateAt={updateAt}
                        removeAt={removeAt}
                        joinPrevious={joinPrevious}
                        leaveGroup={leaveGroup}
                        updateBlockType={updateBlockType}
                      />
                      {canPairBelow(items, idx) ? (
                        <BlockInsertBar
                          key={`ins-${row.localId}`}
                          afterIndex={idx}
                          pairWithNextTyped={pairWithNext}
                          t={t}
                        />
                      ) : null}
                    </Fragment>,
                  );
                  i += 1;
                  continue;
                }
                const bid = row.block_id!;
                const start = i;
                i += 1;
                while (i < items.length && items[i].block_id === bid) i += 1;
                const end = i - 1;
                const accent = blockAccent(bid);
                const bt = items[start].block_type ?? "superset";
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
                    <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 10 }}>
                      <Tag style={{ margin: 0 }} color="processing">
                        {t(`workouts.block.${bt}`)}
                      </Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t("workouts.blockDragBundleHint")}
                      </Typography.Text>
                    </Flex>
                    {Array.from({ length: end - start + 1 }, (_, k) => {
                      const globalIndex = start + k;
                      const r = items[globalIndex];
                      return (
                        <Fragment key={r.localId}>
                          {k > 0 ? (
                            <div
                              style={{
                                height: 1,
                                margin: "6px 0",
                                background: "var(--app-border, rgba(148, 163, 184, 0.22))",
                              }}
                            />
                          ) : null}
                          <SortableRow
                            row={r}
                            index={globalIndex}
                            itemsLen={items.length}
                            prevBlockId={globalIndex > 0 ? items[globalIndex - 1]?.block_id : null}
                            insideBlock
                            t={t}
                            updateAt={updateAt}
                            removeAt={removeAt}
                            joinPrevious={joinPrevious}
                            leaveGroup={leaveGroup}
                            updateBlockType={updateBlockType}
                          />
                        </Fragment>
                      );
                    })}
                    {canPairBelow(items, end) ? (
                      <BlockInsertBar afterIndex={end} pairWithNextTyped={pairWithNext} t={t} />
                    ) : null}
                  </div>,
                );
              }
              return nodes;
            })()}
          </SortableContext>
        </DndContext>
      )}

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
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        footer={
          <Flex justify="flex-end">
            <Button type="primary" onClick={() => setPickerOpen(false)}>
              {t("workouts.pickerDone")}
            </Button>
          </Flex>
        }
        width={640}
        centered
        destroyOnClose
        styles={{ body: { paddingTop: 8, maxHeight: "min(78vh, 640px)", overflow: "hidden", display: "flex", flexDirection: "column" } }}
      >
        {pickerLoading ? (
          <Flex align="center" justify="center" style={{ minHeight: 220 }}>
            <Spin size="large" />
          </Flex>
        ) : (
          <Space direction="vertical" style={{ width: "100%", flex: 1, minHeight: 0 }} size="middle">
            <Segmented
              block
              size="large"
              value={pickerScope}
              onChange={(v) => setPickerScope(v as "all" | "mine" | "catalog")}
              options={[
                { value: "all", label: t("workouts.pickerScopeAll") },
                { value: "mine", label: t("workouts.pickerScopeMine") },
                { value: "catalog", label: t("workouts.pickerScopeCatalog") },
              ]}
            />
            <Input.Search
              allowClear
              size="large"
              autoFocus
              enterButton={<SearchOutlined />}
              placeholder={t("workouts.pickerFilterPh")}
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
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
                minHeight: 280,
                maxHeight: 420,
                overflowY: "auto",
                paddingInlineEnd: 4,
              }}
            >
              {pickerTotal === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("workouts.pickerNoMatches")} />
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
    }));
}
