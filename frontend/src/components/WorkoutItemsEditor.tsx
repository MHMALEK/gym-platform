import { DeleteOutlined, HolderOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
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
import { App, Button, Input, InputNumber, Modal, Select, Space, Typography } from "antd";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
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

function SortableRow({
  row,
  index,
  itemsLen,
  t,
  updateAt,
  removeAt,
  pairWithNext,
  joinPrevious,
  leaveGroup,
  updateBlockType,
}: {
  row: WorkoutLine;
  index: number;
  itemsLen: number;
  t: (k: string) => string;
  updateAt: (i: number, patch: Partial<WorkoutLine>) => void;
  removeAt: (i: number) => void;
  pairWithNext: (i: number) => void;
  joinPrevious: (i: number) => void;
  leaveGroup: (i: number) => void;
  updateBlockType: (blockId: string, bt: WorkoutBlockType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.localId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    borderLeft: row.block_id ? `4px solid ${blockAccent(row.block_id)}` : "4px solid transparent",
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 8,
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
        <div style={{ flex: "1 1 160px", minWidth: 120 }}>
          <Typography.Text strong>{row.exercise_name ?? `ID ${row.exercise_id}`}</Typography.Text>
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
            icon={<LinkOutlined />}
            disabled={index >= itemsLen - 1}
            onClick={() => pairWithNext(index)}
          >
            {t("workouts.pairWithNext")}
          </Button>
          <Button size="small" disabled={index === 0} onClick={() => joinPrevious(index)}>
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
  const [selectedExId, setSelectedExId] = useState<number | null>(null);
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
    setSelectedExId(null);
    setPickerQuery("");
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

  const pickerOptionsGrouped = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const match = (e: ExerciseOpt) => !q || e.name.toLowerCase().includes(q);
    const mineF = mineOpts.filter(match);
    const catF = catalogOpts.filter(match);
    const toOpt = (e: ExerciseOpt) => ({
      value: e.id,
      label: e.source === "catalog" ? `${e.name} (${t("workouts.pickerBadgeCatalog")})` : e.name,
    });
    const groups: { label: string; options: { value: number; label: string }[] }[] = [];
    if (mineF.length) {
      groups.push({ label: t("workouts.pickerGroupMine"), options: mineF.map(toOpt) });
    }
    if (catF.length) {
      groups.push({ label: t("workouts.pickerGroupCatalog"), options: catF.map(toOpt) });
    }
    return groups;
  }, [catalogOpts, mineOpts, pickerQuery, t]);

  const flatPickerChoices = useMemo(
    () => pickerOptionsGrouped.flatMap((g) => g.options),
    [pickerOptionsGrouped],
  );

  const addSelectedExercise = useCallback(() => {
    if (selectedExId == null) return;
    const ex = [...mineOpts, ...catalogOpts].find((e) => e.id === selectedExId);
    if (!ex) return;
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
    setPickerOpen(false);
  }, [catalogOpts, items, mineOpts, pushItems, selectedExId]);

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
    (index: number) => {
      if (index >= items.length - 1) return;
      const bid = newLocalId();
      const bt: WorkoutBlockType = "superset";
      const next = items.map((row, i) => {
        if (i === index || i === index + 1) return { ...row, block_id: bid, block_type: bt };
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
            {items.map((row, index) => (
              <SortableRow
                key={row.localId}
                row={row}
                index={index}
                itemsLen={items.length}
                t={t}
                updateAt={updateAt}
                removeAt={removeAt}
                pairWithNext={pairWithNext}
                joinPrevious={joinPrevious}
                leaveGroup={leaveGroup}
                updateBlockType={updateBlockType}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Modal
        title={t("workouts.pickExercise")}
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onOk={addSelectedExercise}
        okText={t("workouts.add")}
        okButtonProps={{ disabled: selectedExId == null || flatPickerChoices.length === 0 }}
        confirmLoading={pickerLoading}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input
            allowClear
            placeholder={t("workouts.pickerFilterPh")}
            value={pickerQuery}
            onChange={(e) => {
              setPickerQuery(e.target.value);
              setSelectedExId(null);
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("workouts.pickerHint")}
          </Typography.Text>
          <Select
            style={{ width: "100%" }}
            placeholder={t("workouts.pickExercisePh")}
            loading={pickerLoading}
            options={pickerOptionsGrouped}
            value={selectedExId ?? undefined}
            onChange={(v) => setSelectedExId(v)}
            notFoundContent={pickerLoading ? undefined : t("workouts.pickerEmpty")}
          />
        </Space>
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
