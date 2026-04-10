import { useList } from "@refinedev/core";
import type { BaseRecord } from "@refinedev/core";
import { Select } from "antd";
import type { SelectProps } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Props = Omit<SelectProps, "options" | "mode" | "loading">;

export function MuscleGroupSelect(props: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useList<BaseRecord>({
    resource: "directory-muscle-groups",
    pagination: { pageSize: 200, mode: "server" },
  });
  const options = useMemo(
    () =>
      (data?.data ?? []).map((r) => ({
        value: r.id as number,
        label: String(r.label ?? r.id),
      })),
    [data?.data],
  );

  return (
    <Select
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      loading={isLoading}
      placeholder={t("exercises.form.muscleGroupsSelectPh")}
      options={options}
      {...props}
    />
  );
}
