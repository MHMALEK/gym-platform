import type { ThemeConfig } from "antd";

import { coachBrand } from "./brand";

/** Ant Design theme fragment merged into ConfigProvider (with locale-specific fontFamily). */
export function buildCoachTheme(fontFamily: string): ThemeConfig {
  return {
    token: {
      colorPrimary: coachBrand.primary,
      colorSuccess: "#16a34a",
      colorWarning: "#d97706",
      colorError: "#dc2626",
      colorInfo: "#0284c8",
      colorText: coachBrand.text,
      colorTextSecondary: coachBrand.textSecondary,
      colorBgLayout: coachBrand.layoutBg,
      colorBgContainer: coachBrand.surface,
      colorBorder: coachBrand.border,
      colorBorderSecondary: "#f1f5f9",
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
        headerBg: coachBrand.surface,
        headerHeight: 56,
        headerPadding: "0 20px",
        bodyBg: coachBrand.layoutBg,
        footerBg: coachBrand.layoutBg,
        triggerBg: coachBrand.surface,
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 22,
        boxShadowTertiary:
          "0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 4px 12px -2px rgba(15, 23, 42, 0.07)",
      },
      Menu: {
        itemBorderRadius: 8,
        itemMarginInline: 10,
        itemMarginBlock: 2,
        itemHeight: 40,
        iconSize: 18,
        itemSelectedBg: coachBrand.primaryBgSoft,
        itemSelectedColor: coachBrand.primaryActive,
        itemHoverBg: coachBrand.primaryBgHover,
        subMenuItemBg: "transparent",
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
        primaryShadow: "0 2px 0 rgba(13, 148, 136, 0.06)",
      },
      Tabs: {
        titleFontSize: 14,
        inkBarColor: coachBrand.primary,
        itemSelectedColor: coachBrand.primaryActive,
        itemHoverColor: coachBrand.primary,
      },
      Table: {
        headerBg: "#f8fafc",
        headerColor: coachBrand.text,
        borderRadius: 8,
      },
      Typography: {
        titleMarginTop: "0.6em",
        titleMarginBottom: "0.35em",
      },
    },
  };
}
