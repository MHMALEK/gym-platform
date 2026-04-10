import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import { Avatar, Space, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";

import { formatMoney } from "../../lib/money";

type Pt = {
  id: number;
  name: string;
  code?: string | null;
  duration_days: number;
  price?: number | string | null;
  discount_price?: number | string | null;
  currency?: string;
  image_url?: string | null;
  is_active?: boolean;
};

export function PlanTemplateList() {
  const { t, i18n } = useTranslation();
  const loc = i18n.language;
  const { tableProps } = useTable<Pt>({ resource: "plan-templates", syncWithLocation: true });

  return (
    <List headerButtons={<CreateButton />}>
      <Table<Pt> {...tableProps} rowKey="id" scroll={{ x: 960 }}>
        <Table.Column<Pt>
          title=""
          width={56}
          render={(_, r) => (
            <Avatar src={r.image_url || undefined} size={40} style={{ backgroundColor: "#d9d9d9" }}>
              {(r.name || "?").slice(0, 1).toUpperCase()}
            </Avatar>
          )}
        />
        <Table.Column<Pt> dataIndex="id" title={t("planTemplates.list.id")} width={72} />
        <Table.Column<Pt>
          dataIndex="code"
          title={t("planTemplates.list.code")}
          render={(c) => c || t("common.dash")}
          width={120}
        />
        <Table.Column<Pt> dataIndex="name" title={t("planTemplates.list.name")} ellipsis />
        <Table.Column<Pt>
          dataIndex="duration_days"
          title={t("planTemplates.list.duration")}
          width={100}
          render={(d) => t("planTemplates.list.days", { n: d })}
        />
        <Table.Column<Pt>
          title={t("planTemplates.list.pricing")}
          width={200}
          render={(_, r) => {
            const cur = r.currency ?? "USD";
            const disc = r.discount_price != null && r.discount_price !== "";
            return (
              <Space direction="vertical" size={0}>
                {disc ? (
                  <>
                    <Typography.Text delete type="secondary">
                      {formatMoney(r.price, cur, loc)}
                    </Typography.Text>
                    <Typography.Text strong>{formatMoney(r.discount_price, cur, loc)}</Typography.Text>
                  </>
                ) : (
                  <Typography.Text>{formatMoney(r.price, cur, loc)}</Typography.Text>
                )}
              </Space>
            );
          }}
        />
        <Table.Column<Pt>
          dataIndex="is_active"
          title={t("planTemplates.list.active")}
          width={88}
          render={(v) => (v ? t("planTemplates.list.yes") : t("planTemplates.list.no"))}
        />
        <Table.Column<Pt>
          title={t("planTemplates.list.actions")}
          width={100}
          render={(_, record) => (
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
