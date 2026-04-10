import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Input, Space, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ExerciseList() {
  const { t } = useTranslation();
  const { tableProps, setFilters } = useTable({
    resource: "exercises",
    syncWithLocation: true,
  });

  const onSearch = (value: string) => {
    const v = value.trim();
    setFilters(v ? [{ field: "q", operator: "eq", value: v }] : [], "replace");
  };

  return (
    <List headerButtons={<CreateButton />}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("exercises.list.intro")}
        </Typography.Paragraph>
        <Space wrap style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <Input.Search
            allowClear
            placeholder={t("exercises.list.searchPlaceholder")}
            onSearch={onSearch}
            style={{ maxWidth: 360 }}
          />
          <Link to="/library/exercises">{t("exercises.list.openCatalog")}</Link>
        </Space>
        <Table {...tableProps} rowKey="id" locale={{ emptyText: t("exercises.list.empty") }}>
          <Table.Column dataIndex="name" title={t("exercises.list.name")} />
          <Table.Column dataIndex="category" title={t("exercises.list.category")} />
          <Table.Column dataIndex="muscle_groups" title={t("exercises.list.muscles")} />
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
