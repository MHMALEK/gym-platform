import { useList } from "@refinedev/core";
import { Select, Space, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ClientSubscriptionsPanel } from "./ClientSubscriptionsPanel";

type ClientRow = { id: number; name: string };

export function MembershipsPage() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState<number | null>(null);

  const { data: listData, isLoading: listLoading } = useList<ClientRow>({
    resource: "clients",
    pagination: { pageSize: 200, current: 1 },
  });

  const clientOptions = useMemo(
    () =>
      (listData?.data ?? []).map((c) => ({
        value: c.id,
        label: c.name ?? `Client #${c.id}`,
      })),
    [listData?.data],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {t("memberships.pageTitle")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t("memberships.pageHint")}
        </Typography.Paragraph>
        <Typography.Text strong>{t("memberships.client")}</Typography.Text>
        <Select<number>
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("memberships.clientPh")}
          style={{ width: "100%", maxWidth: 420, marginTop: 8, display: "block" }}
          loading={listLoading}
          options={clientOptions}
          value={clientId ?? undefined}
          onChange={(v) => setClientId(v ?? null)}
        />
      </div>

      {clientId != null ? (
        <ClientSubscriptionsPanel clientId={clientId} allowMutation />
      ) : (
        <Typography.Text type="secondary">{t("memberships.selectClient")}</Typography.Text>
      )}
    </Space>
  );
}
