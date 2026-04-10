import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";
import { useTranslation } from "react-i18next";

export function ExerciseList() {
  const { t } = useTranslation();
  const { tableProps } = useTable({ resource: "exercises", syncWithLocation: true });

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t("exercises.list.name")} />
        <Table.Column dataIndex="category" title={t("exercises.list.category")} />
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
    </List>
  );
}
