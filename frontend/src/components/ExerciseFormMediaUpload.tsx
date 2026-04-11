import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppMessage } from "../lib/useAppMessage";
import { linkMediaToExercise, mediaSrc, uploadMediaFile } from "../lib/exerciseMediaApi";
import type { MediaRole } from "../types/media";

export type ExerciseFormMediaUploadProps = {
  value?: string | null;
  onChange?: (url: string | null) => void;
  /** MIME accept list for the file picker */
  accept: string;
  /** Use image preview (thumbnail) or choose video vs image from URL (demo). */
  variant: "thumbnail" | "demo";
  /** When set (edit page), upload also links media to the exercise with this role. */
  exerciseId?: string;
  linkRole?: MediaRole;
  onUploaded?: () => void;
  /** Overrides default empty-state hint for the thumbnail variant (e.g. plan cover). */
  emptyHint?: string;
};

function isProbablyVideoUrl(url: string) {
  return /\.(mp4|webm)(\?|#|$)/i.test(url);
}

export function ExerciseFormMediaUpload({
  value,
  onChange,
  accept,
  variant,
  exerciseId,
  linkRole,
  onUploaded,
  emptyHint,
}: ExerciseFormMediaUploadProps) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadMediaFile(file);
      if (exerciseId && linkRole) {
        await linkMediaToExercise(exerciseId, { media_asset_id: asset.id, role: linkRole });
      }
      onChange?.(asset.public_url);
      onUploaded?.();
      message.success(t("exercises.form.mediaUploadSuccess"));
    } catch (e) {
      const err = e as Error;
      message.error(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = () => {
    onChange?.(null);
  };

  const url = value?.trim() || null;

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      {url ? (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 1,
            maxWidth: 360,
            bgcolor: "action.hover",
          }}
        >
          {variant === "thumbnail" || (variant === "demo" && !isProbablyVideoUrl(url)) ? (
            <img
              src={mediaSrc(url)}
              alt=""
              style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }}
            />
          ) : (
            <video
              key={url}
              src={mediaSrc(url)}
              controls
              muted
              style={{ width: "100%", maxHeight: 220, display: "block" }}
            />
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          {variant === "thumbnail"
            ? emptyHint ?? t("exercises.form.thumbnailEmpty")
            : t("exercises.form.demoEmpty")}
        </Typography>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {t("exercises.form.mediaChooseFile")}
        </Button>
        {url ? (
          <Button variant="outlined" color="inherit" startIcon={<DeleteOutlineIcon />} onClick={clear}>
            {t("exercises.form.mediaRemove")}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
