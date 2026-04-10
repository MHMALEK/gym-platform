import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

const statusColor: Record<string, string> = {
  pending: "gold",
  paid: "green",
  overdue: "red",
  cancelled: "default",
};

export function InvoiceList() {
  const { t } = useTranslation();
  const { tableProps } = useTable({ resource: "invoices", syncWithLocation: true });

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" scroll={{ x: 960 }}>
        <Table.Column
          dataIndex={["client", "name"]}
          title={t("invoices.list.client")}
          width={180}
          render={(_, r: BaseRecord) => (r.client as { name?: string } | undefined)?.name ?? t("common.dash")}
        />
        <Table.Column dataIndex="reference" title={t("invoices.list.reference")} width={120} />
        <Table.Column
          title={t("invoices.list.amount")}
          width={120}
          render={(_, r: BaseRecord) =>
            r.amount != null ? `${r.amount} ${r.currency ?? "USD"}` : t("common.dash")
          }
        />
        <Table.Column
          dataIndex="due_date"
          title={t("invoices.list.due")}
          width={120}
          render={(v: string | null) => (v ? dayjs(v).format("MMM D, YYYY") : t("common.dash"))}
        />
        <Table.Column
          dataIndex="status"
          title={t("invoices.list.status")}
          width={110}
          render={(v: string) => (
            <Tag color={statusColor[v] ?? "default"}>{t(`invoices.status.${v}` as never)}</Tag>
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title={t("invoices.list.created")}
          width={120}
          render={(v: string) => dayjs(v).format("MMM D, YYYY")}
        />
        <Table.Column<BaseRecord>
          title={t("invoices.list.actions")}
          width={100}
          fixed="right"
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
