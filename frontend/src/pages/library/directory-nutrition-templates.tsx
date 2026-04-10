import { List, useTable } from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Button, Input, Space, Table, Typography, message } from "antd";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryNutritionTemplatesPage() {
  const { t } = useTranslation();
  const { tableProps, tableQueryResult, setFilters } = useTable({
    resource: "directory-nutrition-templates",
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

  const copy = async (id: number) => {
    const res = await fetch(`${apiPrefix}/nutrition-templates/from-catalog/${id}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("library.copiedNutritionTemplates"));
    void tableQueryResult.refetch();
  };

  return (
    <List title={t("library.nutritionTemplatesTitle")} breadcrumb={false}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("library.nutritionCatalogIntro")}
        </Typography.Paragraph>
        <Space
          wrap
          style={{ width: "100%", justifyContent: "space-between", alignItems: "center", rowGap: 12 }}
        >
          <Input.Search
            allowClear
            placeholder={t("library.searchNutritionCatalog")}
            onSearch={(v) => applySearch(v)}
            style={{ minWidth: 220, maxWidth: 400, flex: "1 1 220px" }}
          />
          <Link to="/nutrition-templates">
            <Button type="primary">{t("library.goToMyNutritionTemplates")}</Button>
          </Link>
        </Space>
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="name" title={t("library.name")} />
          <Table.Column dataIndex="description" title={t("library.description")} ellipsis />
          <Table.Column dataIndex="meal_count" title={t("nutritionTemplates.list.meals")} width={100} />
          <Table.Column<BaseRecord>
            title={t("library.actions")}
            width={160}
            render={(_, r: BaseRecord) => (
              <Button type="primary" size="small" onClick={() => copy(Number(r.id))}>
                {t("library.copyToMine")}
              </Button>
            )}
          />
        </Table>
      </Space>
    </List>
  );
}
