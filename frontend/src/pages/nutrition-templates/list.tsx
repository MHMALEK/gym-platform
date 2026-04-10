import { PlusOutlined } from "@ant-design/icons";
import { DeleteButton, List, useTable } from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Button, Input, Space, Table, Typography } from "antd";
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
    <List title={t("nutritionTemplates.list.pageTitle")}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("nutritionTemplates.list.intro")}
        </Typography.Paragraph>
        <Space
          wrap
          style={{ width: "100%", justifyContent: "space-between", alignItems: "center", rowGap: 12 }}
        >
          <Input.Search
            allowClear
            placeholder={t("nutritionTemplates.list.searchPlaceholder")}
            onSearch={(v) => applySearch(v)}
            style={{ minWidth: 220, maxWidth: 400, flex: "1 1 220px" }}
          />
          <Space wrap>
            <Link to="/nutrition-templates/create">
              <Button type="primary" icon={<PlusOutlined />}>
                {t("nutritionTemplates.list.addButton")}
              </Button>
            </Link>
            <Link to="/library/nutrition-templates">
              <Button>{t("nutritionTemplates.list.openCatalog")}</Button>
            </Link>
          </Space>
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
            width={200}
            render={(_, record: BaseRecord) => (
              <Space wrap>
                <Link to={`/nutrition-templates/edit/${record.id}`}>
                  <Button type="primary" size="small">
                    {t("actions.edit")}
                  </Button>
                </Link>
                <DeleteButton size="small" recordItemId={record.id}>
                  {t("actions.delete")}
                </DeleteButton>
              </Space>
            )}
          />
        </Table>
      </Space>
    </List>
  );
}
