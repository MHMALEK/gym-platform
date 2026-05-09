import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Image, PlayCircle } from "lucide-react";

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

export function ExerciseMediaPreview({
  url,
  title,
  compact = false,
  fit = "contain",
}: {
  url?: string | null;
  title?: string;
  compact?: boolean;
  fit?: "contain" | "cover";
}) {
  const cleanUrl = url?.trim();
  const embed = cleanUrl ? youtubeEmbedUrl(cleanUrl) : null;
  const height = compact ? 150 : 230;
  const video = cleanUrl ? isVideoUrl(cleanUrl) : false;
  const mediaFit = fit;
  const isStaticImage = !embed && !video;

  if (!cleanUrl) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1}
        sx={{
          height,
          borderRadius: 3,
          border: "1px dashed",
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
        width: "100%",
        height,
        overflow: "hidden",
        borderRadius: 3,
        bgcolor: isStaticImage ? "common.white" : "grey.950",
        border: "1px solid",
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
          style={{ width: "100%", height: "100%", border: 0 }}
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
      {!embed && video ? null : !embed && /\.gif(\?|#|$)/i.test(cleanUrl) ? (
        <Box sx={{ position: "absolute", right: 10, bottom: 10, color: "common.white" }}>
          <PlayCircle size={22} />
        </Box>
      ) : null}
    </Box>
  );
}
