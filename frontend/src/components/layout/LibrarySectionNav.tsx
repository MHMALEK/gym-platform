import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

const LIBRARY_TABS = [
  { path: "/library/exercises", labelKey: "nav.libraryExercisesShort" },
  { path: "/library/training-plans", labelKey: "nav.libraryPlansShort" },
  { path: "/library/nutrition-templates", labelKey: "nav.libraryNutritionShort" },
] as const;

/** In-page tabs for catalog sections (sidebar shows one Library entry). */
export function LibrarySectionNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const value = LIBRARY_TABS.find((tab) => pathname.startsWith(tab.path))?.path ?? LIBRARY_TABS[0].path;

  return (
    <Tabs
      value={value}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
    >
      {LIBRARY_TABS.map((tab) => (
        <Tab
          key={tab.path}
          label={t(tab.labelKey)}
          value={tab.path}
          component={Link}
          to={tab.path}
          sx={{ textTransform: "none", fontWeight: 600, minHeight: 44 }}
        />
      ))}
    </Tabs>
  );
}
