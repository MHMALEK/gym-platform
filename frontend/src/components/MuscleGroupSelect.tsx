import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { useList } from "@refinedev/core";
import type { BaseRecord } from "@refinedev/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Opt = { value: number; label: string };

export type MuscleGroupSelectProps = {
  value?: number[] | null;
  onChange?: (v: number[]) => void;
  disabled?: boolean;
  id?: string;
};

export function MuscleGroupSelect({ value, onChange, disabled, id }: MuscleGroupSelectProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useList<BaseRecord>({
    resource: "directory-muscle-groups",
    pagination: { pageSize: 200, mode: "server" },
  });
  const options = useMemo<Opt[]>(
    () =>
      (data?.data ?? []).map((r) => ({
        value: r.id as number,
        label: String(r.label ?? r.id),
      })),
    [data?.data],
  );

  const selected = useMemo(
    () => options.filter((o) => (value ?? []).includes(o.value)),
    [options, value],
  );

  return (
    <Autocomplete
      id={id}
      multiple
      disableCloseOnSelect
      loading={isLoading}
      options={options}
      value={selected}
      onChange={(_, v) => onChange?.(v.map((x) => x.value))}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t("exercises.form.muscleGroupsSelectPh")}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
