import {
  BookOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FireOutlined,
  IdcardOutlined,
  ReadOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useNotificationProvider, ThemedLayoutV2 } from "@refinedev/antd";
import { Authenticated, Refine } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { App as AntdApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import faIR from "antd/locale/fa_IR";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fa";
import { type ReactNode, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { authProvider } from "./authProvider";
import { DesktopSiderPinned } from "./components/DesktopSiderPinned";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { dataProvider } from "./dataProvider";
import { ClientCreate } from "./pages/clients/create";
import { ClientEdit } from "./pages/clients/edit";
import { ClientList } from "./pages/clients/list";
import { ClientFinance } from "./pages/clients/finance";
import { ClientShow } from "./pages/clients/show";
import { DashboardPage } from "./pages/dashboard";
import { buildCoachTheme } from "./theme/antdCoachTheme";
import { ExerciseCreate } from "./pages/exercises/create";
import { InvoiceCreate } from "./pages/invoices/create";
import { InvoiceEdit } from "./pages/invoices/edit";
import { InvoiceList } from "./pages/invoices/list";
import { ExerciseEdit } from "./pages/exercises/edit";
import { ExerciseList } from "./pages/exercises/list";
import { DirectoryExercisesPage } from "./pages/library/directory-exercises";
import { DirectoryTrainingPlansPage } from "./pages/library/directory-training-plans";
import { LoginPage } from "./pages/login";
import { MembershipsPage } from "./pages/memberships";
import { PlanTemplateCreate } from "./pages/plan-templates/create";
import { PlanTemplateEdit } from "./pages/plan-templates/edit";
import { PlanTemplateList } from "./pages/plan-templates/list";
import { TrainingPlanCreate } from "./pages/training-plans/create";
import { TrainingPlanEdit } from "./pages/training-plans/edit";
import { TrainingPlanList } from "./pages/training-plans/list";
import { TrainingPlanShow } from "./pages/training-plans/show";

function AppLayoutTitle() {
  const { t } = useTranslation();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, marginInlineStart: 8 }}>
      <span>{t("app.title")}</span>
      <LanguageSwitcher />
    </span>
  );
}

function AntdLocaleBridge({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const antdLocale = isFa ? faIR : enUS;
  const direction = isFa ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = isFa ? "fa" : "en";
    document.documentElement.dir = direction;
    dayjs.locale(isFa ? "fa" : "en");
  }, [direction, isFa]);

  const fontFamily = isFa
    ? '"Vazirmatn", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif'
    : '"Inter", "Vazirmatn", system-ui, -apple-system, sans-serif';

  return (
    <ConfigProvider locale={antdLocale} direction={direction} theme={buildCoachTheme(fontFamily)}>
      {children}
    </ConfigProvider>
  );
}

function RefineShell() {
  const { t, i18n } = useTranslation();
  const notificationProvider = useNotificationProvider();

  const resources = useMemo(
    () => [
      {
        name: "dashboard",
        list: "/",
        meta: { label: t("nav.dashboard"), icon: <DashboardOutlined /> },
      },
      {
        name: "clients",
        list: "/clients",
        create: "/clients/create",
        edit: "/clients/edit/:id",
        show: "/clients/show/:id",
        meta: { label: t("nav.clients"), icon: <TeamOutlined /> },
      },
      {
        name: "invoices",
        list: "/invoices",
        create: "/invoices/create",
        edit: "/invoices/edit/:id",
        meta: { label: t("nav.invoices"), icon: <FileTextOutlined /> },
      },
      {
        name: "memberships",
        list: "/memberships",
        meta: { label: t("nav.memberships"), icon: <IdcardOutlined /> },
      },
      {
        name: "plan-templates",
        list: "/plan-templates",
        create: "/plan-templates/create",
        edit: "/plan-templates/edit/:id",
        meta: { label: t("nav.planTemplates"), icon: <BookOutlined /> },
      },
      {
        name: "exercises",
        list: "/exercises",
        create: "/exercises/create",
        edit: "/exercises/edit/:id",
        meta: { label: t("nav.exercises"), icon: <FireOutlined /> },
      },
      {
        name: "training-plans",
        list: "/training-plans",
        create: "/training-plans/create",
        edit: "/training-plans/edit/:id",
        show: "/training-plans/show/:id",
        meta: { label: t("nav.trainingPlans"), icon: <UnorderedListOutlined /> },
      },
      {
        name: "directory-exercises",
        list: "/library/exercises",
        meta: { label: t("nav.libraryExercises"), icon: <ReadOutlined /> },
      },
      {
        name: "directory-training-plans",
        list: "/library/training-plans",
        meta: { label: t("nav.libraryPlans"), icon: <ReadOutlined /> },
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
              <ThemedLayoutV2 Title={AppLayoutTitle} initialSiderCollapsed={false}>
                <DesktopSiderPinned />
                <Outlet />
              </ThemedLayoutV2>
            </Authenticated>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/clients" element={<ClientList />} />
          <Route path="/clients/create" element={<ClientCreate />} />
          <Route path="/clients/edit/:id" element={<ClientEdit />} />
          <Route path="/clients/show/:id/finance" element={<ClientFinance />} />
          <Route path="/clients/show/:id" element={<ClientShow />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/create" element={<InvoiceCreate />} />
          <Route path="/invoices/edit/:id" element={<InvoiceEdit />} />
          <Route path="/memberships" element={<MembershipsPage />} />
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
          <Route path="/library/exercises" element={<DirectoryExercisesPage />} />
          <Route path="/library/training-plans" element={<DirectoryTrainingPlansPage />} />
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
      <AntdLocaleBridge>
        <AntdApp>
          <RefineShell />
        </AntdApp>
      </AntdLocaleBridge>
    </BrowserRouter>
  );
}
