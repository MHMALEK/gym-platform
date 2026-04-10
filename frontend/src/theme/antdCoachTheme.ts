import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

import { coachBrand, coachBrandLight } from "./brand";
import type { ThemeMode } from "./ThemeModeContext";

/** Ant Design theme merged into ConfigProvider (with locale-specific fontFamily). */
export function buildCoachTheme(fontFamily: string, mode: ThemeMode): ThemeConfig {
  const brand = mode === "dark" ? coachBrand : coachBrandLight;
  const algorithm = mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  const cardShadow =
    mode === "dark"
      ? "0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 16px -4px rgba(0, 0, 0, 0.45)"
      : "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.08)";

  const tableRowHover =
    mode === "dark" ? "rgba(20, 184, 166, 0.06)" : "rgba(13, 148, 136, 0.08)";

  const alertInfoBg =
    mode === "dark" ? "rgba(20, 184, 166, 0.12)" : "rgba(13, 148, 136, 0.1)";
  const alertInfoBorder =
    mode === "dark" ? "rgba(20, 184, 166, 0.35)" : "rgba(13, 148, 136, 0.28)";

  return {
    algorithm,
    token: {
      colorPrimary: brand.primary,
      colorSuccess: mode === "dark" ? "#22c55e" : "#16a34a",
      colorWarning: mode === "dark" ? "#f59e0b" : "#d97706",
      colorError: mode === "dark" ? "#f87171" : "#dc2626",
      colorInfo: mode === "dark" ? "#38bdf8" : "#0284c7",
      colorText: brand.text,
      colorTextSecondary: brand.textSecondary,
      colorTextTertiary:
        mode === "dark" ? "rgba(148, 163, 184, 0.85)" : "rgba(100, 116, 139, 0.9)",
      colorTextQuaternary:
        mode === "dark" ? "rgba(148, 163, 184, 0.55)" : "rgba(100, 116, 139, 0.65)",
      colorBgLayout: brand.layoutBg,
      colorBgContainer: brand.surface,
      colorBgElevated: brand.surfaceElevated,
      colorBorder: brand.border,
      colorBorderSecondary: brand.borderSecondary,
      colorSplit: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)",
      wireframe: false,
      fontFamily,
      fontSize: 14,
      borderRadius: 8,
      borderRadiusLG: 12,
      controlHeight: 36,
      controlHeightLG: 40,
      motionDurationMid: "0.2s",
    },
    components: {
      Layout: {
        headerBg: brand.surfaceElevated,
        headerHeight: 56,
        headerPadding: "0 20px",
        bodyBg: brand.layoutBg,
        footerBg: brand.layoutBg,
        triggerBg: brand.surfaceElevated,
        siderBg: brand.surfaceElevated,
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 22,
        colorBgContainer: brand.surface,
        boxShadowTertiary: cardShadow,
      },
      Menu: {
        itemBorderRadius: 8,
        itemMarginInline: 10,
        itemMarginBlock: 2,
        itemHeight: 40,
        iconSize: 18,
        itemSelectedBg: brand.primaryBgSoft,
        itemSelectedColor: brand.primaryHover,
        itemHoverBg: brand.primaryBgHover,
        itemColor: brand.textSecondary,
        subMenuItemBg: "transparent",
        darkItemBg: "transparent",
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
        primaryShadow:
          mode === "dark" ? "0 2px 0 rgba(0, 0, 0, 0.2)" : "0 2px 0 rgba(13, 148, 136, 0.12)",
      },
      Tabs: {
        titleFontSize: 14,
        inkBarColor: brand.primary,
        itemSelectedColor: brand.primaryHover,
        itemHoverColor: brand.primary,
        itemColor: brand.textSecondary,
      },
      Table: {
        headerBg: brand.surfaceElevated,
        headerColor: brand.text,
        borderRadius: 8,
        colorBgContainer: brand.surface,
        rowHoverBg: tableRowHover,
      },
      Typography: {
        titleMarginTop: "0.6em",
        titleMarginBottom: "0.35em",
      },
      Form: {
        verticalLabelPadding: "0 0 4px",
        itemMarginBottom: 16,
        labelColor: brand.textSecondary,
      },
      Input: {
        colorBgContainer: brand.surfaceElevated,
        activeBorderColor: brand.primary,
        hoverBorderColor: brand.primaryHover,
      },
      Select: {
        colorBgContainer: brand.surfaceElevated,
      },
      Modal: {
        contentBg: brand.surface,
        headerBg: brand.surface,
        footerBg: brand.surface,
      },
      Alert: {
        colorInfo: brand.primary,
        colorInfoBg: alertInfoBg,
        colorInfoBorder: alertInfoBorder,
      },
    },
  };
}
