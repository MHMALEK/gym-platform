import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import { useTranslation } from "react-i18next";

export function DirectoryExercisesPage() {
  const { t } = useTranslation();
  const { tableProps } = useTable({ resource: "directory-exercises", syncWithLocation: true });

  return (
    <List title={t("library.exercisesTitle")} breadcrumb={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t("library.name")} />
        <Table.Column dataIndex="category" title={t("library.category")} />
        <Table.Column dataIndex="muscle_groups" title={t("library.muscles")} />
        <Table.Column dataIndex="equipment" title={t("library.equipment")} />
        <Table.Column dataIndex="description" title={t("library.description")} ellipsis />
      </Table>
    </List>
  );
}
