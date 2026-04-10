import { List, useTable } from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Button, Table, message } from "antd";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../../lib/api";

export function DirectoryTrainingPlansPage() {
  const { t } = useTranslation();
  const { tableProps, tableQueryResult } = useTable({
    resource: "directory-training-plans",
    syncWithLocation: true,
  });

  const copy = async (id: number) => {
    const res = await fetch(`${apiPrefix}/training-plans/from-catalog/${id}`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("library.copied"));
    void tableQueryResult.refetch();
  };

  return (
    <List title={t("library.plansTitle")} breadcrumb={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t("library.name")} />
        <Table.Column dataIndex="description" title={t("library.description")} ellipsis />
        <Table.Column<BaseRecord>
          title=""
          width={140}
          render={(_, r: BaseRecord) => (
            <Button type="link" onClick={() => copy(Number(r.id))}>
              {t("library.copyToMine")}
            </Button>
          )}
        />
      </Table>
    </List>
  );
}
