import { useMediaQuery } from "@mui/material";
import { useThemedLayoutContext } from "@refinedev/mui";
import { useEffect } from "react";

/** Keeps the nav rail expanded on large viewports (Refine defaults to a collapsible Sider on desktop). */
export function DesktopSiderPinned() {
  const { siderCollapsed, setSiderCollapsed } = useThemedLayoutContext();
  const isDesktop = useMediaQuery("(min-width:992px)");

  useEffect(() => {
    if (isDesktop && siderCollapsed) setSiderCollapsed(false);
  }, [isDesktop, siderCollapsed, setSiderCollapsed]);

  return null;
}
