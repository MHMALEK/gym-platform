import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

export function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1.2 }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

export function DashboardStatTile({
  icon,
  label,
  value,
  footer,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 118,
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: theme.transitions.create(["border-color", "background-color"], { duration: 140 }),
        "@media (hover: hover)": {
          "&:hover": {
            borderColor: alpha(theme.palette.primary.main, 0.35),
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.03),
          },
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: "0.04em" }}>
            {label}
          </Typography>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, mt: 0.25, lineHeight: 1.15 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
      {footer ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: "auto", lineHeight: 1.45 }}>
          {footer}
        </Typography>
      ) : null}
    </Box>
  );
}

export function DashboardStatTileSkeleton() {
  return (
    <Box sx={{ minHeight: 118, p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
      <Stack direction="row" spacing={1.25}>
        <Skeleton variant="rounded" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="35%" height={28} />
        </Box>
      </Stack>
    </Box>
  );
}
