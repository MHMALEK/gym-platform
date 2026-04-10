import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Input, Select, Space, Table, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ExerciseList() {
  const { t } = useTranslation();
  const { tableProps, setFilters } = useTable({
    resource: "exercises",
    syncWithLocation: true,
  });
  const [q, setQ] = useState("");
  const [venue, setVenue] = useState<string | undefined>();

  const applyFilters = useCallback(
    (nextQ: string, nextVenue?: string) => {
      const f: { field: string; operator: "eq"; value: string }[] = [];
      if (nextQ.trim()) f.push({ field: "q", operator: "eq", value: nextQ.trim() });
      if (nextVenue) f.push({ field: "venue_type", operator: "eq", value: nextVenue });
      setFilters(f, "replace");
    },
    [setFilters],
  );

  const venueFilterOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <List headerButtons={<CreateButton />}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("exercises.list.intro")}
        </Typography.Paragraph>
        <Space wrap style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder={t("exercises.list.searchPlaceholder")}
              onSearch={(v) => {
                setQ(v);
                applyFilters(v, venue);
              }}
              style={{ maxWidth: 360 }}
            />
            <Select
              allowClear
              placeholder={t("exercises.list.filterVenue")}
              style={{ minWidth: 180 }}
              options={venueFilterOptions}
              value={venue}
              onChange={(v) => {
                setVenue(v);
                applyFilters(q, v);
              }}
            />
          </Space>
          <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
        </Space>
        <Table {...tableProps} rowKey="id" locale={{ emptyText: t("exercises.list.empty") }}>
          <Table.Column dataIndex="name" title={t("exercises.list.name")} />
          <Table.Column dataIndex="category" title={t("exercises.list.category")} />
          <Table.Column
            dataIndex="venue_type"
            title={t("exercises.list.venue")}
            render={(v: string) => t(`workouts.venue.${v ?? "both"}`)}
          />
          <Table.Column
            title={t("exercises.list.muscles")}
            render={(_: unknown, record: BaseRecord) => {
              const m = record.muscle_groups as { label?: string }[] | undefined;
              if (m?.length) return m.map((x) => x.label).filter(Boolean).join(", ");
              return "—";
            }}
          />
          <Table.Column dataIndex="equipment" title={t("exercises.list.equipment")} />
          <Table.Column<BaseRecord>
            title={t("exercises.list.actions")}
            render={(_, record: BaseRecord) => (
              <Space>
                <EditButton hideText size="small" recordItemId={record.id} />
                <DeleteButton hideText size="small" recordItemId={record.id} />
              </Space>
            )}
          />
        </Table>
      </Space>
    </List>
  );
}
