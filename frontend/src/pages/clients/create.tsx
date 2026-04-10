import { Create, useForm, useSelect } from "@refinedev/antd";
import { FileTextOutlined, IdcardOutlined, UserOutlined } from "@ant-design/icons";
import { Form, Tabs } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ClientFinancialLockedPlaceholder } from "./ClientFinancialLockedPlaceholder";
import { ClientFormSections } from "./formSections";

export function ClientCreate() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");

  const { formProps, saveButtonProps } = useForm({
    resource: "clients",
    redirect: "edit",
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

  return (
    <Create
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
                  isCreate
                />
              </Form>
            ),
          },
          {
            key: "invoices",
            label: (
              <span>
                <FileTextOutlined /> {t("clients.edit.tabInvoices")}
              </span>
            ),
            children: (
              <div style={{ paddingTop: 4 }}>
                <ClientFinancialLockedPlaceholder />
              </div>
            ),
          },
          {
            key: "membership",
            label: (
              <span>
                <IdcardOutlined /> {t("clients.edit.tabMembership")}
              </span>
            ),
            children: (
              <div style={{ paddingTop: 4 }}>
                <ClientFinancialLockedPlaceholder />
              </div>
            ),
          },
        ]}
      />
    </Create>
  );
}
