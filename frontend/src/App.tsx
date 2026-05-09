import CssBaseline from "@mui/material/CssBaseline";
import {
  Apple,
  BookOpen,
  Dumbbell,
  FileText,
  Flame,
  Home,
  LayoutDashboard,
  Library,
  MessageCircle,
  Palette,
  Users,
} from "lucide-react";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { RefineSnackbarProvider, useNotificationProvider } from "@refinedev/mui";
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
import { AppShell } from "./components/layout/AppShell";
import {
  BrandedMuiOverride,
  CoachBrandingProvider,
  EmotionDirectionBridge,
} from "./contexts/CoachBrandingContext";
import { dataProvider } from "./dataProvider";
import { ClientCreate } from "./pages/clients/create";
import { ClientEdit } from "./pages/clients/edit";
import { ClientList } from "./pages/clients/list";
import { ClientFinance } from "./pages/clients/finance";
import { ClientShow } from "./pages/clients/show";
import { ClientPlanViewerPage } from "./pages/clients/plan-viewer";
import { ClientWorkoutDietPlansPage } from "./pages/clients/workout-diet-plans";
import { CoachAssistantPage } from "./pages/assistant/CoachAssistantPage";
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
import { TrainingPlanPreviewPage } from "./pages/training-plans/preview";
import { TrainingPlanShow } from "./pages/training-plans/show";

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
        meta: { label: t("nav.coachDesk"), icon: <Home size={18} strokeWidth={2} /> },
      },
      {
        name: "dashboard",
        list: "/dashboard",
        meta: { label: t("nav.dashboard"), icon: <LayoutDashboard size={18} strokeWidth={2} /> },
      },
      {
        name: "coach-assistant",
        list: "/assistant",
        meta: { label: t("nav.coachAssistant"), icon: <MessageCircle size={18} strokeWidth={2} /> },
      },
      {
        name: "clients",
        list: "/clients",
        create: "/clients/create",
        edit: "/clients/edit/:id",
        show: "/clients/show/:id",
        meta: { label: t("nav.clients"), icon: <Users size={18} strokeWidth={2} /> },
      },
      {
        name: "invoices",
        list: "/invoices",
        create: "/invoices/create",
        edit: "/invoices/edit/:id",
        meta: { label: t("nav.invoices"), icon: <FileText size={18} strokeWidth={2} /> },
      },
      {
        name: "plan-templates",
        list: "/plan-templates",
        create: "/plan-templates/create",
        edit: "/plan-templates/edit/:id",
        meta: { label: t("nav.planTemplates"), icon: <BookOpen size={18} strokeWidth={2} /> },
      },
      {
        name: "exercises",
        list: "/exercises",
        create: "/exercises/create",
        edit: "/exercises/edit/:id",
        meta: { label: t("nav.exercises"), icon: <Flame size={18} strokeWidth={2} /> },
      },
      {
        name: "training-plans",
        list: "/training-plans",
        create: "/training-plans/create",
        edit: "/training-plans/edit/:id",
        show: "/training-plans/show/:id",
        meta: { label: t("nav.trainingPlans"), icon: <Dumbbell size={18} strokeWidth={2} /> },
      },
      {
        name: "nutrition-templates",
        list: "/nutrition-templates",
        create: "/nutrition-templates/create",
        edit: "/nutrition-templates/edit/:id",
        meta: { label: t("nav.nutritionTemplates"), icon: <Apple size={18} strokeWidth={2} /> },
      },
      {
        name: "directory-exercises",
        list: "/library/exercises",
        meta: { label: t("nav.libraryExercises"), icon: <Library size={18} strokeWidth={2} /> },
      },
      {
        name: "directory-training-plans",
        list: "/library/training-plans",
        meta: { label: t("nav.libraryPlans"), icon: <Library size={18} strokeWidth={2} /> },
      },
      {
        name: "directory-nutrition-templates",
        list: "/library/nutrition-templates",
        meta: { label: t("nav.libraryNutritionTemplates"), icon: <Library size={18} strokeWidth={2} /> },
      },
      {
        name: "branding",
        list: "/settings/branding",
        meta: { label: t("nav.branding"), icon: <Palette size={18} strokeWidth={2} /> },
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
                  <AppShell>
                    <Outlet />
                  </AppShell>
                </BrandedMuiOverride>
              </CoachBrandingProvider>
            </Authenticated>
          }
        >
          <Route index element={<CoachDeskPage />} />
          <Route path="/workouts" element={<Navigate to="/training-plans" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<CoachAssistantPage />} />
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/create" element={<ClientCreate />} />
          <Route path="/clients/edit/:id" element={<ClientEdit />} />
          <Route path="/clients/show/:id/finance" element={<ClientFinance />} />
          <Route path="/clients/show/:id/workout-diet-plans" element={<ClientWorkoutDietPlansPage />} />
          <Route path="/clients/show/:id/plan-viewer" element={<ClientPlanViewerPage />} />
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
          <Route path="/training-plans/preview/:id" element={<TrainingPlanPreviewPage />} />
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
