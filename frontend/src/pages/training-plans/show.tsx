import { Show } from "@refinedev/antd";
import { useInvalidate, useShow } from "@refinedev/core";
import { useParams } from "react-router-dom";
import { Button, Input, Table, Typography, message } from "antd";
import { useEffect, useState } from "react";

import { apiPrefix, authHeaders } from "../../lib/api";

type Item = {
  id: number;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
  exercise?: { id: number; name: string };
};

type PlanRecord = {
  id?: number;
  name?: string;
  description?: string;
  items?: Item[];
};

export function TrainingPlanShow() {
  const { id } = useParams();
  const invalidate = useInvalidate();
  const { query } = useShow({ resource: "training-plans" });
  const record = query?.data?.data as PlanRecord | undefined;
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record?.items) {
      setJson("[]");
      return;
    }
    const payload = record.items.map((i) => ({
      exercise_id: i.exercise_id,
      sort_order: i.sort_order,
      sets: i.sets,
      reps: i.reps,
      duration_sec: i.duration_sec,
      rest_sec: i.rest_sec,
      notes: i.notes,
    }));
    setJson(JSON.stringify(payload, null, 2));
  }, [record?.items]);

  const saveItems = async () => {
    if (!record?.id) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      message.error("Invalid JSON");
      return;
    }
    if (!Array.isArray(parsed)) {
      message.error("Expected a JSON array");
      return;
    }
    setSaving(true);
    const res = await fetch(`${apiPrefix}/training-plans/${record.id}/items`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(parsed),
    });
    setSaving(false);
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success("Workout items saved");
    if (id) {
      void invalidate({
        resource: "training-plans",
        invalidates: ["detail"],
        id,
      });
    }
  };

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>{record?.name}</Typography.Title>
      <Typography.Paragraph>{record?.description}</Typography.Paragraph>

      <Typography.Title level={5}>Current exercises</Typography.Title>
      <Table<Item>
        dataSource={record?.items ?? []}
        rowKey="id"
        pagination={false}
        columns={[
          { title: "#", dataIndex: "sort_order", width: 48 },
          { title: "Exercise", render: (_, r) => r.exercise?.name ?? r.exercise_id },
          { title: "Sets", dataIndex: "sets" },
          { title: "Reps", dataIndex: "reps" },
          { title: "Sec", dataIndex: "duration_sec" },
          { title: "Rest", dataIndex: "rest_sec" },
          { title: "Notes", dataIndex: "notes" },
        ]}
      />

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Edit items (JSON)
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Array of objects: exercise_id, sort_order, sets, reps, duration_sec, rest_sec, notes. Use
        directory exercise IDs or your custom exercise IDs.
      </Typography.Paragraph>
      <Input.TextArea rows={12} value={json} onChange={(e) => setJson(e.target.value)} />
      <Button type="primary" onClick={saveItems} loading={saving} style={{ marginTop: 8 }}>
        Save items
      </Button>
    </Show>
  );
}
