import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { Apple, Dumbbell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";

/** Plans shell — workout + nutrition under one nav tab. */
export function ClientPlansLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const value = pathname.includes("/nutrition") ? "nutrition" : "workout";

  return (
    <>
      <Tabs
        value={value}
        variant="fullWidth"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label={t("clientPortal.nav.workout")}
          value="workout"
          icon={<Dumbbell size={18} strokeWidth={2} />}
          iconPosition="start"
          component={Link}
          to="/client/plans/workout"
          sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
        />
        <Tab
          label={t("clientPortal.nav.nutrition")}
          value="nutrition"
          icon={<Apple size={18} strokeWidth={2} />}
          iconPosition="start"
          component={Link}
          to="/client/plans/nutrition"
          sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
        />
      </Tabs>
      <Outlet />
    </>
  );
}
