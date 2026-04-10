import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";
import { useTranslation } from "react-i18next";

export function TrainingPlanList() {
  const { t } = useTranslation();
  const { tableProps } = useTable({ resource: "training-plans", syncWithLocation: true });

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t("trainingPlans.list.name")} />
        <Table.Column dataIndex="description" title={t("trainingPlans.list.description")} ellipsis />
        <Table.Column
          dataIndex="source_catalog_plan_id"
          title={t("trainingPlans.list.fromCatalog")}
          render={(v) => v ?? t("common.dash")}
        />
        <Table.Column<BaseRecord>
          title={t("trainingPlans.list.actions")}
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
