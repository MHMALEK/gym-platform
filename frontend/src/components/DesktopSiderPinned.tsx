import { useThemedLayoutContext } from "@refinedev/antd";
import { Grid } from "antd";
import { useEffect } from "react";

/** Keeps the nav rail expanded on large viewports (Refine defaults to a collapsible Sider on desktop). */
export function DesktopSiderPinned() {
  const { siderCollapsed, setSiderCollapsed } = useThemedLayoutContext();
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg === true;

  useEffect(() => {
    if (isDesktop && siderCollapsed) setSiderCollapsed(false);
  }, [isDesktop, siderCollapsed, setSiderCollapsed]);

  return null;
}
