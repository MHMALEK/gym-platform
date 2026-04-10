import { List, useTable } from "@refinedev/antd";
import { useInvalidate } from "@refinedev/core";
import type { BaseRecord } from "@refinedev/core";
import { Alert, App, Button, Input, Select, Space, Table, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryExercisesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [venue, setVenue] = useState<string | undefined>();
  const { tableProps, setFilters } = useTable({
    resource: "directory-exercises",
    syncWithLocation: true,
  });

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

  const copyToMine = useCallback(
    async (id: number) => {
      setCopyingId(id);
      try {
        const res = await fetch(`${apiPrefix}/exercises/from-directory/${id}`, {
          method: "POST",
          headers: authHeaders(),
          body: "{}",
        });
        if (!res.ok) {
          message.error((await res.text()) || t("library.copyExerciseError"));
          return;
        }
        message.success(t("library.copyExerciseSuccess"));
        await invalidate({ resource: "exercises", invalidates: ["list"] });
      } catch {
        message.error(t("library.copyExerciseError"));
      } finally {
        setCopyingId(null);
      }
    },
    [invalidate, message, t],
  );

  return (
    <List title={t("library.exercisesTitle")} breadcrumb={false}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message={t("library.catalogIntroTitle")}
          description={t("library.catalogIntroBody")}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("library.readOnlyHint")}
        </Typography.Paragraph>
        <Space wrap style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder={t("library.searchCatalog")}
              onSearch={(v) => {
                setQ(v);
                applyFilters(v, venue);
              }}
              style={{ maxWidth: 360 }}
            />
            <Select
              allowClear
              placeholder={t("library.filterVenue")}
              style={{ minWidth: 200 }}
              options={venueFilterOptions}
              value={venue}
              onChange={(v) => {
                setVenue(v);
                applyFilters(q, v);
              }}
            />
          </Space>
          <Link to="/exercises">{t("library.goToMyExercises")}</Link>
        </Space>
        <Table {...tableProps} rowKey="id" locale={{ emptyText: t("library.catalogEmpty") }}>
          <Table.Column dataIndex="name" title={t("library.name")} />
          <Table.Column dataIndex="category" title={t("library.category")} />
          <Table.Column
            dataIndex="venue_type"
            title={t("library.venueColumn")}
            render={(v: string) => t(`workouts.venue.${v ?? "both"}`)}
          />
          <Table.Column dataIndex="muscle_groups" title={t("library.muscles")} />
          <Table.Column dataIndex="equipment" title={t("library.equipment")} />
          <Table.Column dataIndex="description" title={t("library.description")} ellipsis />
          <Table.Column<BaseRecord>
            title={t("library.actions")}
            width={160}
            render={(_, record: BaseRecord) => (
              <Button
                type="primary"
                size="small"
                loading={copyingId === Number(record.id)}
                onClick={() => void copyToMine(Number(record.id))}
              >
                {t("library.copyExerciseToMine")}
              </Button>
            )}
          />
        </Table>
      </Space>
    </List>
  );
}
