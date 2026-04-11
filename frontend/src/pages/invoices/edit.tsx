import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useSelect } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import dayjs from "dayjs";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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

export function InvoiceEdit() {
  const { t } = useTranslation();
  const { control, saveButtonProps } = useForm<InvoiceFormValues>({
    refineCoreProps: { resource: "invoices" },
  });

  const clientSelect = useSelect({
    resource: "clients",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button component={Link} to="/invoices/create" variant="outlined" startIcon={<AddIcon />} size="medium">
              {t("common.quickLinks.newInvoice")}
            </Button>
            <Button component={Link} to="/clients/create" variant="outlined" size="medium">
              {t("common.quickLinks.newClient")}
            </Button>
          </Stack>
        </>
      )}
    >
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
            <TextField {...field} value={field.value ?? ""} label="Status" fullWidth margin="normal" select>
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
    </Edit>
  );
}
