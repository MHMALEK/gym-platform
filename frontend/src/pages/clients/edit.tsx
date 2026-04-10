import { Edit, useForm, useSelect } from "@refinedev/antd";
import {
  EyeOutlined,
  FileTextOutlined,
  IdcardOutlined,
  SnippetsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Form, Tabs, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { ClientInvoicesPanel, ClientMembershipPanel } from "./finance";
import { clientWorkoutDietPath } from "./ClientPlansCta";
import { ClientFormSections } from "./formSections";

export function ClientEdit() {
  const { t } = useTranslation();
  const { id: idFromRoute } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("profile");

  const {
    formProps,
    saveButtonProps,
    id: idFromForm,
  } = useForm({
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
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          {validId ? (
            <Link to={clientWorkoutDietPath(clientId)}>
              <Button type="default" icon={<SnippetsOutlined />} size="middle">
                {t("clients.plans.headerButton")}
              </Button>
            </Link>
          ) : null}
        </>
      )}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
    >
      <div className="client-page-shell">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          destroyInactiveTabPane={false}
          tabBarExtraContent={
            validId ? (
              <Link to={`/clients/show/${clientId}`}>
                <Button type="default" icon={<EyeOutlined />} size="middle">
                  {t("clients.edit.openView")}
                </Button>
              </Link>
            ) : null
          }
          items={[
            {
              key: "profile",
              label: (
                <span>
                  <UserOutlined /> {t("clients.edit.tabProfile")}
                </span>
              ),
              children: (
                <>
                  <Typography.Paragraph type="secondary" className="client-edit-profile-hint">
                    {t("clients.edit.profileEditHint")}
                  </Typography.Paragraph>
                  <Form {...formProps} layout="vertical" className="client-profile-form">
                    <ClientFormSections
                      goalTypeSelectProps={goalTypeSelectProps}
                      planSelectProps={planSelectProps}
                      isCreate={false}
                      coachingPlansClientId={validId ? clientId : undefined}
                    />
                  </Form>
                </>
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
      </div>
    </Edit>
  );
}
