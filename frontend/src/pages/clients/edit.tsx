import DescriptionIcon from "@mui/icons-material/Description";
import IdcardIcon from "@mui/icons-material/Badge";
import SnippetsIcon from "@mui/icons-material/Article";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { Edit } from "@refinedev/mui";
import { useSelect } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { ClientInvoicesPanel, ClientMembershipPanel } from "./finance";
import { clientWorkoutDietPath } from "./ClientPlansCta";
import { ClientFormSections, type ClientFormValues } from "./formSections";

export function ClientEdit() {
  const { t } = useTranslation();
  const { id: idFromRoute } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("profile");

  const {
    control,
    saveButtonProps,
    refineCore: { id: idFromForm },
  } = useForm<ClientFormValues>({
    refineCoreProps: { resource: "clients" },
  });

  const goalTypeSelect = useSelect({
    resource: "directory-goal-types",
    optionLabel: "label",
    optionValue: "id",
    pagination: { current: 1, pageSize: 100, mode: "server" },
  });

  const planSelect = useSelect({
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
          <Button component={Link} to="/clients/create" variant="outlined" size="medium">
            {t("common.quickLinks.newClient")}
          </Button>
          {validId ? (
            <Button
              component={Link}
              to={clientWorkoutDietPath(clientId)}
              variant="outlined"
              size="medium"
              startIcon={<SnippetsIcon />}
            >
              {t("clients.plans.headerButton")}
            </Button>
          ) : null}
        </>
      )}
      contentProps={{ sx: { pt: 1, px: 1.5 } }}
    >
      <div className="client-page-shell">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderBottom: 1,
            borderColor: "divider",
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1, minHeight: 48 }}
          >
            <Tab
              icon={<PersonIcon fontSize="small" />}
              iconPosition="start"
              value="profile"
              label={t("clients.edit.tabProfile")}
            />
            {validId ? (
              <Tab
                icon={<DescriptionIcon fontSize="small" />}
                iconPosition="start"
                value="invoices"
                label={t("clients.edit.tabInvoices")}
              />
            ) : null}
            {validId ? (
              <Tab
                icon={<IdcardIcon fontSize="small" />}
                iconPosition="start"
                value="membership"
                label={t("clients.edit.tabMembership")}
              />
            ) : null}
          </Tabs>
          {validId ? (
            <Button
              component={Link}
              to={`/clients/show/${clientId}`}
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon />}
              sx={{ mb: 0.5 }}
            >
              {t("clients.edit.openView")}
            </Button>
          ) : null}
        </Box>

        {activeTab === "profile" ? (
          <>
            <Typography variant="body2" color="text.secondary" className="client-edit-profile-hint" sx={{ mb: 2 }}>
              {t("clients.edit.profileEditHint")}
            </Typography>
            <ClientFormSections
              control={control}
              goalTypeSelect={goalTypeSelect}
              planSelect={planSelect}
              isCreate={false}
              coachingPlansClientId={validId ? clientId : undefined}
            />
          </>
        ) : null}

        {activeTab === "invoices" && validId ? (
          <Box sx={{ pt: 0.5 }}>
            <ClientInvoicesPanel clientId={clientId} />
          </Box>
        ) : null}

        {activeTab === "membership" && validId ? (
          <Box sx={{ pt: 0.5 }}>
            <ClientMembershipPanel clientId={clientId} />
          </Box>
        ) : null}
      </div>
    </Edit>
  );
}
