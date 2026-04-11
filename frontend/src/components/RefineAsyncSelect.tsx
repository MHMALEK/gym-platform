import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { BaseOption } from "@refinedev/core";

/** Options + search callback from `useSelect` (@refinedev/core). */
export type RefineAsyncSelectBind = {
  options: BaseOption[];
  onSearch: (value: string) => void;
};

type RefineAsyncSelectProps = {
  bind: RefineAsyncSelectBind;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
};

export function RefineAsyncSelect({
  bind,
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  required,
  disabled,
}: RefineAsyncSelectProps) {
  const { options, onSearch } = bind;
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Autocomplete
      disabled={disabled}
      options={options}
      value={selected}
      onChange={(_, v) => onChange(v?.value ?? null)}
      getOptionLabel={(o) => (o == null ? "" : String(o.label ?? ""))}
      isOptionEqualToValue={(a, b) => a?.value === b?.value}
      onInputChange={(_, input, reason) => {
        if (reason === "input") onSearch(input);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
        />
      )}
    />
  );
}
