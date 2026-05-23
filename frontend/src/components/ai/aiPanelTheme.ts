import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

/** AI-specific accent — distinct from coach orange primary actions. */
export const AI_ACCENT = {
  main: "#8b5cf6",
  light: "#a78bfa",
  dark: "#7c3aed",
} as const;

export function aiSoftBg(theme: Theme): string {
  return alpha(AI_ACCENT.main, theme.palette.mode === "dark" ? 0.14 : 0.09);
}

export function aiSoftBorder(theme: Theme): string {
  return alpha(AI_ACCENT.main, theme.palette.mode === "dark" ? 0.38 : 0.28);
}

export function aiHeaderGradient(theme: Theme): string {
  const a = theme.palette.mode === "dark" ? 0.16 : 0.1;
  return `linear-gradient(135deg, ${alpha(AI_ACCENT.main, a)} 0%, transparent 72%)`;
}

export const promptChipSx = (theme: Theme) => ({
  height: "auto",
  maxWidth: "100%",
  borderRadius: 2,
  border: "1px solid",
  borderColor: aiSoftBorder(theme),
  bgcolor: aiSoftBg(theme),
  color: "text.primary",
  transition: theme.transitions.create(["background-color", "border-color"], {
    duration: theme.transitions.duration.shorter,
  }),
  "& .MuiChip-label": {
    whiteSpace: "normal",
    py: 0.75,
    lineHeight: 1.35,
    fontSize: 12.5,
  },
  "&:hover": {
    bgcolor: alpha(AI_ACCENT.main, theme.palette.mode === "dark" ? 0.22 : 0.14),
    borderColor: AI_ACCENT.main,
  },
  "&.Mui-disabled": {
    opacity: 0.55,
  },
});

export const aiComposerSx = (theme: Theme) => ({
  flex: 1,
  px: 1.5,
  py: 1,
  borderRadius: 2.5,
  fontSize: 14,
  lineHeight: 1.45,
  color: "text.primary",
  bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.04) : theme.palette.background.default,
  border: "1px solid",
  borderColor: "divider",
  transition: theme.transitions.create(["border-color", "box-shadow"]),
  "&:focus-within": {
    borderColor: alpha(AI_ACCENT.main, 0.55),
    boxShadow: `0 0 0 3px ${alpha(AI_ACCENT.main, 0.18)}`,
  },
  "& textarea": { overflow: "auto !important" },
});

export const aiSendButtonSx = (theme: Theme, active: boolean) => ({
  flexShrink: 0,
  width: 40,
  height: 40,
  bgcolor: active ? AI_ACCENT.main : alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.06),
  color: active ? "#fff" : "text.disabled",
  "&:hover": {
    bgcolor: active ? AI_ACCENT.dark : alpha(theme.palette.text.primary, 0.12),
  },
  "&.Mui-disabled": {
    bgcolor: alpha(theme.palette.text.primary, 0.06),
    color: "text.disabled",
  },
});

export const aiFabSx = {
  bgcolor: AI_ACCENT.main,
  color: "#fff",
  boxShadow: (theme: Theme) =>
    theme.palette.mode === "dark"
      ? `0 8px 28px ${alpha(AI_ACCENT.main, 0.45)}`
      : `0 8px 24px ${alpha(AI_ACCENT.main, 0.35)}`,
  "&:hover": {
    bgcolor: AI_ACCENT.dark,
  },
};
