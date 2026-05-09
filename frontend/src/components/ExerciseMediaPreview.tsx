import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Image, PlayCircle } from "lucide-react";
import type { SxProps, Theme } from "@mui/material/styles";

import { mediaSrc } from "../lib/exerciseMediaApi";

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

type AspectInput = string | { xs?: string; sm?: string; md?: string; lg?: string; xl?: string };

export function ExerciseMediaPreview({
  url,
  title,
  compact = false,
  fit = "contain",
  aspectRatio,
  rounded = true,
  fill = false,
  blendOnDark = false,
}: {
  url?: string | null;
  title?: string;
  compact?: boolean;
  fit?: "contain" | "cover";
  /** When provided, media uses CSS aspect-ratio instead of fixed pixel heights. */
  aspectRatio?: AspectInput;
  /** When false, container has no border-radius (used inside other rounded surfaces). */
  rounded?: boolean;
  /** Fill 100% width + height of parent (parent must have a sized height). */
  fill?: boolean;
  /** Soft-blend white-bg illustrations into a dark surface (only affects static images on dark theme). */
  blendOnDark?: boolean;
}) {
  const cleanUrl = url?.trim();
  const embed = cleanUrl ? youtubeEmbedUrl(cleanUrl) : null;
  const video = cleanUrl ? isVideoUrl(cleanUrl) : false;
  const mediaFit = fit;
  const isStaticImage = !embed && !video;

  const sizeSx: SxProps<Theme> = fill
    ? { width: "100%", height: "100%" }
    : aspectRatio
    ? {
        width: "100%",
        aspectRatio:
          typeof aspectRatio === "string" ? aspectRatio : (aspectRatio as Record<string, string>),
        height: "auto",
      }
    : { width: "100%", height: compact ? 150 : 230 };

  const radius = rounded ? 3 : 0;

  if (!cleanUrl) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1}
        sx={{
          ...sizeSx,
          borderRadius: radius,
          border: rounded ? "1px dashed" : "none",
          borderColor: "divider",
          bgcolor: "action.hover",
          color: "text.secondary",
        }}
      >
        <Image size={24} />
        <Typography variant="body2">No media yet</Typography>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        ...sizeSx,
        overflow: "hidden",
        borderRadius: radius,
        bgcolor: isStaticImage ? "common.white" : "grey.950",
        border: rounded ? "1px solid" : "none",
        borderColor: "divider",
        backgroundImage: isStaticImage
          ? "none"
          : "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.16), transparent 35%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent)",
      }}
    >
      {embed ? (
        <iframe
          src={embed}
          title={title ?? "Exercise tutorial"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      ) : video ? (
        <video
          src={mediaSrc(cleanUrl)}
          controls
          muted
          style={{ width: "100%", height: "100%", objectFit: mediaFit, objectPosition: "center", display: "block" }}
        />
      ) : (
        <img
          src={mediaSrc(cleanUrl)}
          alt={title ?? ""}
          style={{ width: "100%", height: "100%", objectFit: mediaFit, objectPosition: "center", display: "block" }}
        />
      )}
      {blendOnDark && isStaticImage ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, transparent 78%, color-mix(in srgb, var(--app-surface) 92%, transparent) 100%)",
            "html[data-theme='light'] &": { display: "none" },
          }}
        />
      ) : null}
      {!embed && video ? null : !embed && /\.gif(\?|#|$)/i.test(cleanUrl) ? (
        <Box sx={{ position: "absolute", right: 10, bottom: 10, color: "common.white" }}>
          <PlayCircle size={22} />
        </Box>
      ) : null}
    </Box>
  );
}
