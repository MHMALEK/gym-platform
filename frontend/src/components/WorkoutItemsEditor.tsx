import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useInvalidate } from "@refinedev/core";
import { App, Button, Input, InputNumber, Modal, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../lib/api";

export type WorkoutLine = {
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
  exercise_name?: string;
};

type ExerciseOpt = { id: number; name: string };

export function normalizeWorkoutItemsForApi(items: WorkoutLine[]) {
  return items.map((it, index) => ({
    exercise_id: it.exercise_id,
    sort_order: index,
    sets: it.sets ?? null,
    reps: it.reps ?? null,
    duration_sec: it.duration_sec ?? null,
    rest_sec: it.rest_sec ?? null,
    notes: it.notes?.trim() ? it.notes.trim() : null,
  }));
}

async function loadMergedExercises(venueCompat: string | null | undefined): Promise<ExerciseOpt[]> {
  const sp = new URLSearchParams({ limit: "200", offset: "0" });
  if (venueCompat === "home" || venueCompat === "commercial_gym") {
    sp.set("venue_compat", venueCompat);
  }
  const h = authHeaders();
  const [a, b] = await Promise.all([
    fetch(`${apiPrefix}/directory/exercises?${sp}`, { headers: h }),
    fetch(`${apiPrefix}/exercises?${sp}`, { headers: h }),
  ]);
  const aj = (await a.json()) as { items?: ExerciseOpt[] };
  const bj = (await b.json()) as { items?: ExerciseOpt[] };
  const map = new Map<number, ExerciseOpt>();
  for (const x of aj.items ?? []) map.set(x.id, x);
  for (const x of bj.items ?? []) map.set(x.id, x);
  return Array.from(map.values()).sort((u, v) => u.name.localeCompare(v.name));
}

export type WorkoutItemsEditorProps = {
  mode: "training-plan" | "client";
  planId?: number;
  planVenue?: string | null;
  initialItems: WorkoutLine[];
  showSaveButton?: boolean;
  onChange?: (items: WorkoutLine[]) => void;
};

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
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOpt[]>([]);
  const [selectedExId, setSelectedExId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const venueCompat = useMemo(() => {
    if (planVenue === "home" || planVenue === "commercial_gym") return planVenue;
    return undefined;
  }, [planVenue]);

  useEffect(() => {
    const next = (initialItems ?? []).map((x, i) => ({
      ...x,
      sort_order: i,
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
    try {
      const opts = await loadMergedExercises(venueCompat ?? null);
      setExerciseOptions(opts);
    } catch {
      message.error(t("workouts.loadExercisesError"));
    } finally {
      setPickerLoading(false);
    }
  }, [message, t, venueCompat]);

  const addSelectedExercise = useCallback(() => {
    if (selectedExId == null) return;
    const ex = exerciseOptions.find((e) => e.id === selectedExId);
    if (!ex) return;
    const next = [
      ...items,
      {
        exercise_id: ex.id,
        sort_order: items.length,
        sets: 3,
        reps: 10,
        duration_sec: null,
        rest_sec: 60,
        notes: null,
        exercise_name: ex.name,
      },
    ];
    pushItems(next);
    setPickerOpen(false);
  }, [exerciseOptions, items, pushItems, selectedExId]);

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= items.length) return;
      const next = [...items];
      [next[index], next[j]] = [next[j], next[index]];
      pushItems(next.map((row, i) => ({ ...row, sort_order: i })));
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

  const columns: ColumnsType<WorkoutLine & { _row: number }> = useMemo(
    () => [
      {
        title: "#",
        width: 44,
        render: (_, __, i) => i + 1,
      },
      {
        title: t("workouts.colExercise"),
        render: (_, row) => row.exercise_name ?? `ID ${row.exercise_id}`,
      },
      {
        title: t("workouts.colSets"),
        width: 88,
        render: (_, row, i) => (
          <InputNumber
            min={0}
            size="small"
            style={{ width: "100%" }}
            value={row.sets ?? undefined}
            onChange={(v) => updateAt(i, { sets: v == null ? null : Number(v) })}
          />
        ),
      },
      {
        title: t("workouts.colReps"),
        width: 88,
        render: (_, row, i) => (
          <InputNumber
            min={0}
            size="small"
            style={{ width: "100%" }}
            value={row.reps ?? undefined}
            onChange={(v) => updateAt(i, { reps: v == null ? null : Number(v) })}
          />
        ),
      },
      {
        title: t("workouts.colDurationSec"),
        width: 100,
        render: (_, row, i) => (
          <InputNumber
            min={0}
            size="small"
            style={{ width: "100%" }}
            value={row.duration_sec ?? undefined}
            onChange={(v) => updateAt(i, { duration_sec: v == null ? null : Number(v) })}
          />
        ),
      },
      {
        title: t("workouts.colRestSec"),
        width: 100,
        render: (_, row, i) => (
          <InputNumber
            min={0}
            size="small"
            style={{ width: "100%" }}
            value={row.rest_sec ?? undefined}
            onChange={(v) => updateAt(i, { rest_sec: v == null ? null : Number(v) })}
          />
        ),
      },
      {
        title: t("workouts.colNotes"),
        render: (_, row, i) => (
          <Input
            size="small"
            value={row.notes ?? ""}
            onChange={(e) => updateAt(i, { notes: e.target.value || null })}
          />
        ),
      },
      {
        title: t("workouts.colActions"),
        width: 132,
        render: (_, __, i) => (
          <Space size={4}>
            <Button size="small" icon={<ArrowUpOutlined />} onClick={() => move(i, -1)} disabled={i === 0} />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
            />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAt(i)} />
          </Space>
        ),
      },
    ],
    [items.length, move, removeAt, t, updateAt],
  );

  const dataSource = items.map((row, i) => ({ ...row, _row: i }));

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
      <Table<WorkoutLine & { _row: number }>
        size="small"
        rowKey={(r) => `${r.exercise_id}-${r._row}`}
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        locale={{ emptyText: t("workouts.emptyItems") }}
      />

      <Modal
        title={t("workouts.pickExercise")}
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onOk={addSelectedExercise}
        okText={t("workouts.add")}
        okButtonProps={{ disabled: selectedExId == null }}
        confirmLoading={pickerLoading}
      >
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          placeholder={t("workouts.pickExercisePh")}
          loading={pickerLoading}
          options={exerciseOptions.map((e) => ({ value: e.id, label: e.name }))}
          value={selectedExId ?? undefined}
          onChange={(v) => setSelectedExId(v)}
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
    exercise?: { name?: string };
  }>,
): WorkoutLine[] {
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      exercise_id: row.exercise_id,
      sort_order: row.sort_order,
      sets: row.sets ?? null,
      reps: row.reps ?? null,
      duration_sec: row.duration_sec ?? null,
      rest_sec: row.rest_sec ?? null,
      notes: row.notes ?? null,
      exercise_name: row.exercise?.name,
    }));
}
