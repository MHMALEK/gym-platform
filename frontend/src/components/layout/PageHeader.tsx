import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** Page-level title block: large title, muted subtitle, right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  subtitleMaxWidth = 720,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Use `"none"` so the subtitle spans the full content width (e.g. assistant page). */
  subtitleMaxWidth?: number | "none";
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "flex-end" }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 22, md: 26 },
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: subtitleMaxWidth === "none" ? "none" : subtitleMaxWidth }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
