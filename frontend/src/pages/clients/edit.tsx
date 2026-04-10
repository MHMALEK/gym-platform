import { Edit, useForm, useSelect } from "@refinedev/antd";
import { FileTextOutlined, IdcardOutlined, UserOutlined } from "@ant-design/icons";
import { Form, Tabs } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { ClientInvoicesPanel, ClientMembershipPanel } from "./finance";
import { ClientFormSections } from "./formSections";

export function ClientEdit() {
  const { t } = useTranslation();
  const { id: idFromRoute } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("profile");

  const { formProps, saveButtonProps, id: idFromForm } = useForm({
    resource: "clients",
  });

  const { selectProps: goalTypeSelectProps } = useSelect({
    resource: "directory-goal-types",
    optionLabel: "label",
    optionValue: "id",
    pagination: { current: 1, pageSize: 100, mode: "server" },
  });

  const { selectProps: planSelectProps } = useSelect({
    resource: "plan-templates",
    optionLabel: "name",
    optionValue: "id",
    pagination: { current: 1, pageSize: 200, mode: "server" },
  });

  const rawId = idFromForm ?? idFromRoute;
  const clientId =
    rawId != null && String(rawId).length > 0 ? Number(rawId) : Number.NaN;
  const validId = Number.isFinite(clientId);

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyInactiveTabPane={false}
        size="large"
        items={[
          {
            key: "profile",
            label: (
              <span>
                <UserOutlined /> {t("clients.edit.tabProfile")}
              </span>
            ),
            children: (
              <Form {...formProps} layout="vertical">
                <ClientFormSections
                  goalTypeSelectProps={goalTypeSelectProps}
                  planSelectProps={planSelectProps}
                  isCreate={false}
                />
              </Form>
            ),
          },
          ...(validId
            ? [
                {
                  key: "invoices" as const,
                  label: (
                    <span>
                      <FileTextOutlined /> {t("clients.edit.tabInvoices")}
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <ClientInvoicesPanel clientId={clientId} />
                    </div>
                  ),
                },
                {
                  key: "membership" as const,
                  label: (
                    <span>
                      <IdcardOutlined /> {t("clients.edit.tabMembership")}
                    </span>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <ClientMembershipPanel clientId={clientId} />
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Edit>
  );
}
