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
  const { id } = useParams<{ id: string }>();
  const clientId = id ? Number(id) : NaN;
  const [activeTab, setActiveTab] = useState("profile");

  const { formProps, saveButtonProps } = useForm({ resource: "clients" });

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

  const validId = Number.isFinite(clientId);

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyInactiveTabPane={false}
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
