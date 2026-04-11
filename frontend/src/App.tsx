import AppleIcon from "@mui/icons-material/Apple";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PaletteIcon from "@mui/icons-material/Palette";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import HomeIcon from "@mui/icons-material/Home";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import GroupsIcon from "@mui/icons-material/Groups";
import ViewListIcon from "@mui/icons-material/ViewList";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { RefineSnackbarProvider, useNotificationProvider, ThemedLayoutV2 } from "@refinedev/mui";
import { Authenticated, Refine } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fa";
import { type ReactNode, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { authProvider } from "./authProvider";
import {
  BrandedMuiOverride,
  CoachBrandingProvider,
  EmotionDirectionBridge,
  useCoachBranding,
} from "./contexts/CoachBrandingContext";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { dataProvider } from "./dataProvider";
import { ClientCreate } from "./pages/clients/create";
import { ClientEdit } from "./pages/clients/edit";
import { ClientList } from "./pages/clients/list";
import { ClientFinance } from "./pages/clients/finance";
import { ClientShow } from "./pages/clients/show";
import { ClientWorkoutDietPlansPage } from "./pages/clients/workout-diet-plans";
import { CoachDeskPage } from "./pages/coach-desk";
import { DashboardPage } from "./pages/dashboard";
import { buildCoachMuiTheme } from "./theme/muiCoachTheme";
import { ThemeModeProvider, useThemeMode } from "./theme/ThemeModeContext";
import { ExerciseCreate } from "./pages/exercises/create";
import { InvoiceCreate } from "./pages/invoices/create";
import { InvoiceEdit } from "./pages/invoices/edit";
import { InvoiceList } from "./pages/invoices/list";
import { ExerciseEdit } from "./pages/exercises/edit";
import { ExerciseList } from "./pages/exercises/list";
import { DirectoryExercisesPage } from "./pages/library/directory-exercises";
import { DirectoryNutritionTemplatesPage } from "./pages/library/directory-nutrition-templates";
import { DirectoryTrainingPlansPage } from "./pages/library/directory-training-plans";
import { NutritionTemplateCreate } from "./pages/nutrition-templates/create";
import { NutritionTemplateEdit } from "./pages/nutrition-templates/edit";
import { NutritionTemplateList } from "./pages/nutrition-templates/list";
import { LoginPage } from "./pages/login";
import { BrandingSettingsPage } from "./pages/settings/branding";
import { PlanTemplateCreate } from "./pages/plan-templates/create";
import { PlanTemplateEdit } from "./pages/plan-templates/edit";
import { PlanTemplateList } from "./pages/plan-templates/list";
import { TrainingPlanCreate } from "./pages/training-plans/create";
import { TrainingPlanEdit } from "./pages/training-plans/edit";
import { TrainingPlanList } from "./pages/training-plans/list";
import { TrainingPlanShow } from "./pages/training-plans/show";
import { mediaSrc } from "./lib/exerciseMediaApi";

function AppLayoutTitle() {
  const { t } = useTranslation();
  const { branding } = useCoachBranding();
  const displayName = branding.loading ? t("app.title") : branding.name || t("app.title");
  return (
    <Stack
      className="app-sider-title"
      spacing={1.25}
      sx={{
        py: 1,
        pr: 0.5,
        width: "100%",
        minWidth: 0,
        alignItems: "stretch",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          flexWrap: "nowrap",
          minWidth: 0,
          columnGap: 1,
        }}
      >
        {branding.logoUrl && !branding.loading ? (
          <Box
            component="img"
            src={mediaSrc(branding.logoUrl)}
            alt=""
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              objectFit: "cover",
              flexShrink: 0,
              display: "block",
            }}
          />
        ) : null}
        <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.35,
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </Typography>
          {branding.tagline && !branding.loading ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: "block", mt: 0.25 }}>
              {branding.tagline}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ flexShrink: 0, alignSelf: "center" }}>
          <ThemeSwitcher />
        </Box>
      </Stack>
      <LanguageSwitcher layout="sider" />
    </Stack>
  );
}

function MuiLocaleBridge({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { mode } = useThemeMode();
  const isFa = i18n.language.startsWith("fa");
  const direction = isFa ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = isFa ? "fa" : "en";
    document.documentElement.dir = direction;
    dayjs.locale(isFa ? "fa" : "en");
  }, [direction, isFa]);

  const fontFamily = isFa
    ? '"Vazirmatn", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif'
    : '"Inter", "Vazirmatn", system-ui, -apple-system, sans-serif';

  const theme = useMemo(
    () => buildCoachMuiTheme(fontFamily, mode, direction, null),
    [fontFamily, mode, direction],
  );

  return (
    <EmotionDirectionBridge direction={direction}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={isFa ? "fa" : "en"}>
          <RefineSnackbarProvider>{children}</RefineSnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </EmotionDirectionBridge>
  );
}

function RefineShell() {
  const { t, i18n } = useTranslation();
  const notificationProvider = useNotificationProvider();

  const resources = useMemo(
    () => [
      {
        name: "coach-desk",
        list: "/",
        meta: { label: t("nav.coachDesk"), icon: <HomeIcon /> },
      },
      {
        name: "dashboard",
        list: "/dashboard",
        meta: { label: t("nav.dashboard"), icon: <DashboardIcon /> },
      },
      {
        name: "clients",
        list: "/clients",
        create: "/clients/create",
        edit: "/clients/edit/:id",
        show: "/clients/show/:id",
        meta: { label: t("nav.clients"), icon: <GroupsIcon /> },
      },
      {
        name: "invoices",
        list: "/invoices",
        create: "/invoices/create",
        edit: "/invoices/edit/:id",
        meta: { label: t("nav.invoices"), icon: <DescriptionIcon /> },
      },
      {
        name: "plan-templates",
        list: "/plan-templates",
        create: "/plan-templates/create",
        edit: "/plan-templates/edit/:id",
        meta: { label: t("nav.planTemplates"), icon: <MenuBookIcon /> },
      },
      {
        name: "exercises",
        list: "/exercises",
        create: "/exercises/create",
        edit: "/exercises/edit/:id",
        meta: { label: t("nav.exercises"), icon: <LocalFireDepartmentIcon /> },
      },
      {
        name: "training-plans",
        list: "/training-plans",
        create: "/training-plans/create",
        edit: "/training-plans/edit/:id",
        show: "/training-plans/show/:id",
        meta: { label: t("nav.trainingPlans"), icon: <ViewListIcon /> },
      },
      {
        name: "nutrition-templates",
        list: "/nutrition-templates",
        create: "/nutrition-templates/create",
        edit: "/nutrition-templates/edit/:id",
        meta: { label: t("nav.nutritionTemplates"), icon: <AppleIcon /> },
      },
      {
        name: "directory-exercises",
        list: "/library/exercises",
        meta: { label: t("nav.libraryExercises"), icon: <LibraryBooksIcon /> },
      },
      {
        name: "directory-training-plans",
        list: "/library/training-plans",
        meta: { label: t("nav.libraryPlans"), icon: <LibraryBooksIcon /> },
      },
      {
        name: "directory-nutrition-templates",
        list: "/library/nutrition-templates",
        meta: { label: t("nav.libraryNutritionTemplates"), icon: <LibraryBooksIcon /> },
      },
      {
        name: "branding",
        list: "/settings/branding",
        meta: { label: t("nav.branding"), icon: <PaletteIcon /> },
      },
    ],
    [t, i18n.language],
  );

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProvider}
      notificationProvider={notificationProvider}
      resources={resources}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <Authenticated key="login-gate" fallback={<LoginPage />}>
              <Navigate to="/" replace />
            </Authenticated>
          }
        />
        <Route
          element={
            <Authenticated key="app-gate" fallback={<Navigate to="/login" replace />}>
              <CoachBrandingProvider>
                <BrandedMuiOverride>
                  <ThemedLayoutV2 Title={AppLayoutTitle} initialSiderCollapsed={false}>
                    <Outlet />
                  </ThemedLayoutV2>
                </BrandedMuiOverride>
              </CoachBrandingProvider>
            </Authenticated>
          }
        >
          <Route index element={<CoachDeskPage />} />
          <Route path="/workouts" element={<Navigate to="/training-plans" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/create" element={<ClientCreate />} />
          <Route path="/clients/edit/:id" element={<ClientEdit />} />
          <Route path="/clients/show/:id/finance" element={<ClientFinance />} />
          <Route path="/clients/show/:id/workout-diet-plans" element={<ClientWorkoutDietPlansPage />} />
          <Route path="/clients/show/:id" element={<ClientShow />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/create" element={<InvoiceCreate />} />
          <Route path="/invoices/edit/:id" element={<InvoiceEdit />} />
          <Route path="/plan-templates" element={<PlanTemplateList />} />
          <Route path="/plan-templates/create" element={<PlanTemplateCreate />} />
          <Route path="/plan-templates/edit/:id" element={<PlanTemplateEdit />} />
          <Route path="/exercises" element={<ExerciseList />} />
          <Route path="/exercises/create" element={<ExerciseCreate />} />
          <Route path="/exercises/edit/:id" element={<ExerciseEdit />} />
          <Route path="/training-plans" element={<TrainingPlanList />} />
          <Route path="/training-plans/create" element={<TrainingPlanCreate />} />
          <Route path="/training-plans/edit/:id" element={<TrainingPlanEdit />} />
          <Route path="/training-plans/show/:id" element={<TrainingPlanShow />} />
          <Route path="/nutrition-templates" element={<NutritionTemplateList />} />
          <Route path="/nutrition-templates/create" element={<NutritionTemplateCreate />} />
          <Route path="/nutrition-templates/edit/:id" element={<NutritionTemplateEdit />} />
          <Route path="/library/exercises" element={<DirectoryExercisesPage />} />
          <Route path="/library/training-plans" element={<DirectoryTrainingPlansPage />} />
          <Route path="/library/nutrition-templates" element={<DirectoryNutritionTemplatesPage />} />
          <Route path="/settings/branding" element={<BrandingSettingsPage />} />
        </Route>
      </Routes>
      <UnsavedChangesNotifier />
      <DocumentTitleHandler />
    </Refine>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeModeProvider>
        <MuiLocaleBridge>
          <RefineShell />
        </MuiLocaleBridge>
      </ThemeModeProvider>
    </BrowserRouter>
  );
}
