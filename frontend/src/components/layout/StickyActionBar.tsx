import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/**
 * Sticky action bar that pins to the bottom of the page content.
 * Place at the end of a page; it floats above the content with a
 * blurred background and hairline top border.
 *
 * The parent should add `pb` to its body to leave room — the bar is
 * `position: sticky` so it doesn't overlap the last row in normal flow.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <Box
      component="div"
      role="toolbar"
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 5,
        mt: 3,
        mx: { xs: -2, sm: -3, md: -5 },
        // Keeps the bar visually flush with the page edges in our AppShell layout.
        px: { xs: 2, sm: 3, md: 5 },
        py: 1.25,
        bgcolor: "background.default",
        borderTop: 1,
        borderColor: "divider",
        backdropFilter: "saturate(180%) blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {children}
    </Box>
  );
}
