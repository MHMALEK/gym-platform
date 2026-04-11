import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useSelect } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { ClientCoachingPlanAssignmentPanel } from "./ClientCoachingPlanAssignmentPanel";
import { ClientPlansCta, clientWorkoutDietPath } from "./ClientPlansCta";
import {
  type ClientDetailTab,
  clientDetailTabsSx,
  clientTabScrollIds,
  hashForTab,
  tabFromHash,
} from "./clientTabNav";
import { ClientInvoicesPanel, ClientMembershipPanel } from "./finance";
import { ClientFormSections, type ClientFormValues } from "./formSections";

export function ClientEdit() {
  const { t } = useTranslation();
  const { id: idFromRoute } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ClientDetailTab>(() => tabFromHash(window.location.hash));

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

  useEffect(() => {
    setActiveTab(tabFromHash(location.hash));
  }, [location.hash]);

  useEffect(() => {
    const h = location.hash.replace(/^#/, "");
    if (h !== "invoices" && h !== "membership" && h !== "financial" && h !== "workout") return;
    const id =
      h === "membership"
        ? clientTabScrollIds.membership
        : h === "workout"
          ? clientTabScrollIds.workout
          : clientTabScrollIds.invoices;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab, location.hash]);

  const onTabChange = (_: SyntheticEvent, key: ClientDetailTab) => {
    setActiveTab(key);
    navigate(
      { pathname: location.pathname, search: location.search, hash: hashForTab(key) },
      { replace: true },
    );
  };

  const goWorkoutTab = useCallback(() => {
    navigate(
      { pathname: location.pathname, search: location.search, hash: "workout" },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

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
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                size="medium"
                startIcon={<ArticleOutlinedIcon />}
                onClick={goWorkoutTab}
              >
                {t("clients.plans.headerButton")}
              </Button>
              <Button component={Link} to={clientWorkoutDietPath(clientId)} size="small" variant="outlined">
                {t("clients.plans.openFullPage")}
              </Button>
              <Button
                component={Link}
                to={`/clients/show/${clientId}`}
                variant="outlined"
                size="medium"
                startIcon={<VisibilityOutlinedIcon />}
              >
                {t("clients.edit.openView")}
              </Button>
            </Stack>
          ) : null}
        </>
      )}
      contentProps={{ sx: { pt: 1, px: 1.5 } }}
    >
      <Box className="client-page-shell">
        {validId ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>{t("clients.edit.editModeTitle")}</AlertTitle>
            <Stack spacing={1}>
              <Typography variant="body2" component="span" sx={{ lineHeight: 1.55 }}>
                {t("clients.edit.editModeDescription")}
              </Typography>
            </Stack>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onChange={onTabChange} variant="scrollable" scrollButtons="auto" sx={clientDetailTabsSx}>
          <Tab
            icon={<PersonOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label={t("clients.show.tabProfile")}
            value="profile"
          />
          {validId ? (
            <Tab
              icon={<DescriptionOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabWorkout")}
              value="workout"
            />
          ) : null}
          {validId ? (
            <Tab
              icon={<ArticleOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabInvoices")}
              value="invoices"
            />
          ) : null}
          {validId ? (
            <Tab
              icon={<CreditCardOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("clients.show.tabMembership")}
              value="membership"
            />
          ) : null}
        </Tabs>

        <Box sx={{ display: activeTab === "profile" ? "block" : "none" }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              maxWidth: 720,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15, 23, 42, 0.04)",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ m: 0, lineHeight: 1.6 }}>
              {t("clients.edit.profileEditHint")}
            </Typography>
          </Paper>
          <ClientFormSections
            control={control}
            goalTypeSelect={goalTypeSelect}
            planSelect={planSelect}
            isCreate={false}
          />
          {validId ? <ClientPlansCta clientId={clientId} compact /> : null}
        </Box>

        {validId ? (
          <Box id={clientTabScrollIds.workout} sx={{ display: activeTab === "workout" ? "block" : "none", pt: 0.5 }}>
            <ClientCoachingPlanAssignmentPanel clientId={clientId} hideNutritionSection />
          </Box>
        ) : null}

        {validId ? (
          <Box id={clientTabScrollIds.invoices} sx={{ display: activeTab === "invoices" ? "block" : "none", pt: 0.5 }}>
            <ClientInvoicesPanel clientId={clientId} />
          </Box>
        ) : null}

        {validId ? (
          <Box
            id={clientTabScrollIds.membership}
            sx={{ display: activeTab === "membership" ? "block" : "none", pt: 0.5 }}
          >
            <ClientMembershipPanel clientId={clientId} />
          </Box>
        ) : null}
      </Box>
    </Edit>
  );
}
