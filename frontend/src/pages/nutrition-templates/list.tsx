import { CreateButton, DeleteButton, EditButton, List, useTable } from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Input, Space, Table, Typography } from "antd";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function NutritionTemplateList() {
  const { t } = useTranslation();
  const { tableProps, setFilters } = useTable({
    resource: "nutrition-templates",
    syncWithLocation: true,
  });
  const applySearch = useCallback(
    (nextQ: string) => {
      setFilters(
        nextQ.trim() ? [{ field: "q", operator: "eq", value: nextQ.trim() }] : [],
        "replace",
      );
    },
    [setFilters],
  );

  return (
    <List headerButtons={<CreateButton />}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("nutritionTemplates.list.intro")}
        </Typography.Paragraph>
        <Space wrap style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <Input.Search
            allowClear
            placeholder={t("nutritionTemplates.list.searchPlaceholder")}
            onSearch={(v) => applySearch(v)}
            style={{ maxWidth: 360 }}
          />
          <Link to="/library/nutrition-templates">{t("nutritionTemplates.list.openCatalog")}</Link>
        </Space>
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="name" title={t("nutritionTemplates.list.name")} />
          <Table.Column dataIndex="description" title={t("nutritionTemplates.list.description")} ellipsis />
          <Table.Column
            dataIndex="meal_count"
            title={t("nutritionTemplates.list.meals")}
            width={100}
            render={(v: number) => v ?? 0}
          />
          <Table.Column
            dataIndex="source_catalog_template_id"
            title={t("nutritionTemplates.list.fromCatalog")}
            render={(v) => v ?? t("common.dash")}
          />
          <Table.Column<BaseRecord>
            title={t("nutritionTemplates.list.actions")}
            width={120}
            render={(_, record: BaseRecord) => (
              <Space wrap>
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
