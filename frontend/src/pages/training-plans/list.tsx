import {
  CreateButton,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord } from "@refinedev/core";
import { Alert, Button, Select, Space, Table } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function TrainingPlanList() {
  const { t } = useTranslation();
  const { tableProps, setFilters } = useTable({ resource: "training-plans", syncWithLocation: true });

  const venueOptions = [
    { value: "", label: t("exercises.list.filterVenue") + " —" },
    { value: "mixed", label: t("workouts.venue.mixed") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <List headerButtons={<CreateButton />}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t("trainingPlans.list.builderIntroTitle")}
        description={t("trainingPlans.list.builderIntroBody")}
      />
      <Space style={{ marginBottom: 12 }}>
        <Select
          allowClear
          placeholder={t("trainingPlans.list.venue")}
          style={{ minWidth: 200 }}
          options={venueOptions.filter((o) => o.value !== "")}
          onChange={(v) => {
            setFilters(
              v ? [{ field: "venue_type", operator: "eq", value: v }] : [],
              "replace",
            );
          }}
        />
      </Space>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t("trainingPlans.list.name")} />
        <Table.Column dataIndex="description" title={t("trainingPlans.list.description")} ellipsis />
        <Table.Column
          dataIndex="venue_type"
          title={t("trainingPlans.list.venue")}
          render={(v: string) => t(`workouts.venue.${v ?? "mixed"}`)}
        />
        <Table.Column
          dataIndex="source_catalog_plan_id"
          title={t("trainingPlans.list.fromCatalog")}
          render={(v) => v ?? t("common.dash")}
        />
        <Table.Column<BaseRecord>
          title={t("trainingPlans.list.actions")}
          render={(_, record: BaseRecord) => (
            <Space wrap>
              <Link to={`/training-plans/edit/${record.id}`}>
                <Button type="primary" size="small">
                  {t("trainingPlans.list.buildWorkout")}
                </Button>
              </Link>
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
