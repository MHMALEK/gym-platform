import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Create } from "@refinedev/mui";
import { useSelect } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import dayjs from "dayjs";
import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { useSearchParams } from "react-router-dom";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { RefineAsyncSelect } from "../../components/RefineAsyncSelect";
import { INVOICE_STATUS_OPTIONS } from "./invoiceOptions";

type InvoiceFormValues = {
  client_id?: number | null;
  reference?: string | null;
  amount?: number | null;
  currency?: string | null;
  due_date?: string | null;
  status?: string | null;
  notes?: string | null;
};

export function InvoiceCreate() {
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get("client_id");
  const initialClientId = useMemo(
    () => (presetClientId ? Number(presetClientId) : undefined),
    [presetClientId],
  );

  const defaults = useMemo(
    () => ({
      client_id: initialClientId ?? null,
      currency: "USD",
      status: "pending",
      reference: "",
      amount: null as number | null,
      due_date: null as string | null,
      notes: "",
    }),
    [initialClientId],
  );

  const { control, saveButtonProps } = useForm<InvoiceFormValues>({
    refineCoreProps: { resource: "invoices" },
    defaultValues: defaults,
  });

  const clientSelect = useSelect({
    resource: "clients",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Box component="form" sx={{ maxWidth: 560 }}>
        <Controller
          name="client_id"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <RefineAsyncSelect
              bind={{ options: clientSelect.options, onSearch: clientSelect.onSearch }}
              value={field.value}
              onChange={field.onChange}
              label="Client"
              placeholder="Select client"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="reference"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Invoice # / reference" fullWidth margin="normal" />
          )}
        />
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label="Amount"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              margin="normal"
              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
            />
          )}
        />
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Currency" inputProps={{ maxLength: 8 }} fullWidth margin="normal" />
          )}
        />
        <Controller
          name="due_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Due date"
              value={field.value ? dayjs(field.value) : null}
              onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : null)}
              slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
            />
          )}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? "pending"} label="Status" fullWidth margin="normal" select>
              {[...INVOICE_STATUS_OPTIONS].map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Notes" fullWidth margin="normal" multiline minRows={3} />
          )}
        />
      </Box>
    </Create>
  );
}
