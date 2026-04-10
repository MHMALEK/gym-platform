import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

import { coachBrand } from "./brand";

/** Ant Design theme fragment merged into ConfigProvider (with locale-specific fontFamily). */
export function buildCoachTheme(fontFamily: string): ThemeConfig {
  return {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: coachBrand.primary,
      colorSuccess: "#22c55e",
      colorWarning: "#f59e0b",
      colorError: "#f87171",
      colorInfo: "#38bdf8",
      colorText: coachBrand.text,
      colorTextSecondary: coachBrand.textSecondary,
      colorTextTertiary: "rgba(148, 163, 184, 0.85)",
      colorTextQuaternary: "rgba(148, 163, 184, 0.55)",
      colorBgLayout: coachBrand.layoutBg,
      colorBgContainer: coachBrand.surface,
      colorBgElevated: coachBrand.surfaceElevated,
      colorBorder: coachBrand.border,
      colorBorderSecondary: coachBrand.borderSecondary,
      colorSplit: "rgba(148, 163, 184, 0.12)",
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
        headerBg: coachBrand.surfaceElevated,
        headerHeight: 56,
        headerPadding: "0 20px",
        bodyBg: coachBrand.layoutBg,
        footerBg: coachBrand.layoutBg,
        triggerBg: coachBrand.surfaceElevated,
        siderBg: coachBrand.surfaceElevated,
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 22,
        colorBgContainer: coachBrand.surface,
        boxShadowTertiary: "0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 16px -4px rgba(0, 0, 0, 0.45)",
      },
      Menu: {
        itemBorderRadius: 8,
        itemMarginInline: 10,
        itemMarginBlock: 2,
        itemHeight: 40,
        iconSize: 18,
        itemSelectedBg: coachBrand.primaryBgSoft,
        itemSelectedColor: coachBrand.primaryHover,
        itemHoverBg: coachBrand.primaryBgHover,
        itemColor: coachBrand.textSecondary,
        subMenuItemBg: "transparent",
        darkItemBg: "transparent",
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
        primaryShadow: "0 2px 0 rgba(0, 0, 0, 0.2)",
      },
      Tabs: {
        titleFontSize: 14,
        inkBarColor: coachBrand.primary,
        itemSelectedColor: coachBrand.primaryHover,
        itemHoverColor: coachBrand.primary,
        itemColor: coachBrand.textSecondary,
      },
      Table: {
        headerBg: coachBrand.surfaceElevated,
        headerColor: coachBrand.text,
        borderRadius: 8,
        colorBgContainer: coachBrand.surface,
        rowHoverBg: "rgba(20, 184, 166, 0.06)",
      },
      Typography: {
        titleMarginTop: "0.6em",
        titleMarginBottom: "0.35em",
      },
      Form: {
        verticalLabelPadding: "0 0 4px",
        itemMarginBottom: 16,
        labelColor: coachBrand.textSecondary,
      },
      Input: {
        colorBgContainer: coachBrand.surfaceElevated,
        activeBorderColor: coachBrand.primary,
        hoverBorderColor: coachBrand.primaryHover,
      },
      Select: {
        colorBgContainer: coachBrand.surfaceElevated,
      },
      Modal: {
        contentBg: coachBrand.surface,
        headerBg: coachBrand.surface,
        footerBg: coachBrand.surface,
      },
      Alert: {
        colorInfo: coachBrand.primary,
        colorInfoBg: "rgba(20, 184, 166, 0.12)",
        colorInfoBorder: "rgba(20, 184, 166, 0.35)",
      },
    },
  };
}
