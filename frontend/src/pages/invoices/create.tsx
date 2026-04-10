import { Create, useForm, useSelect } from "@refinedev/antd";
import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { INVOICE_STATUS_OPTIONS } from "./invoiceOptions";

export function InvoiceCreate() {
  const [searchParams] = useSearchParams();
  const presetClientId = searchParams.get("client_id");
  const initialClientId = useMemo(
    () => (presetClientId ? Number(presetClientId) : undefined),
    [presetClientId]
  );

  const { formProps, saveButtonProps } = useForm({
    resource: "invoices",
  });

  const { selectProps: clientSelectProps } = useSelect({
    resource: "clients",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          ...formProps.initialValues,
          client_id: initialClientId,
          currency: "USD",
          status: "pending",
        }}
      >
        <Form.Item name="client_id" label="Client" rules={[{ required: true }]}>
          <Select {...clientSelectProps} style={{ width: "100%" }} placeholder="Select client" />
        </Form.Item>
        <Form.Item name="reference" label="Invoice # / reference">
          <Input />
        </Form.Item>
        <Form.Item name="amount" label="Amount">
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="currency" label="Currency">
          <Input maxLength={8} />
        </Form.Item>
        <Form.Item
          name="due_date"
          label="Due date"
          getValueFromEvent={(d) => (d ? d.format("YYYY-MM-DD") : null)}
          getValueProps={(v) => ({ value: v ? dayjs(v) : undefined })}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select options={[...INVOICE_STATUS_OPTIONS]} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Create>
  );
}
