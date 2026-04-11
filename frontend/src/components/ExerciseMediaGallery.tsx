import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppMessage } from "../lib/useAppMessage";
import {
  type ExerciseMediaItemDTO,
  type MediaRole,
  linkMediaToExercise,
  listExerciseMedia,
  mediaSrc,
  patchExerciseMediaLink,
  reorderExerciseMedia,
  unlinkExerciseMedia,
  uploadMediaFile,
} from "../lib/exerciseMediaApi";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

function isVideo(ct: string) {
  return ct.startsWith("video/");
}

export function ExerciseMediaGallery({
  exerciseId,
  refreshSignal = 0,
}: {
  exerciseId: string;
  /** Increment to reload the list (e.g. after thumbnail / demo upload from the form). */
  refreshSignal?: number;
}) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const eidNum = Number(exerciseId);
  const [items, setItems] = useState<ExerciseMediaItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!exerciseId || Number.isNaN(eidNum)) return;
    setLoading(true);
    try {
      const data = await listExerciseMedia(exerciseId);
      setItems([...data].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
    } catch (e) {
      message.error((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, eidNum, message]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const handleUploadFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadMediaFile(file);
      await linkMediaToExercise(exerciseId, { media_asset_id: asset.id, role: "gallery" });
      await load();
    } catch (e) {
      const err = e as Error;
      message.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const roleOptions: { value: MediaRole; label: string }[] = [
    { value: "gallery", label: t("exercises.mediaGallery.roleGallery") },
    { value: "thumbnail", label: t("exercises.mediaGallery.roleThumbnail") },
    { value: "primary_video", label: t("exercises.mediaGallery.rolePrimaryVideo") },
  ];

  const move = async (linkId: number, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const ids = sorted.map((x) => x.id);
    const idx = ids.indexOf(linkId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    const nextIds = [...ids];
    [nextIds[idx], nextIds[j]] = [nextIds[j]!, nextIds[idx]!];
    try {
      const next = await reorderExerciseMedia(exerciseId, nextIds);
      setItems([...next].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const onRoleChange = async (linkId: number, role: MediaRole) => {
    try {
      await patchExerciseMediaLink(exerciseId, linkId, role);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const onDelete = async (linkId: number) => {
    try {
      await unlinkExerciseMedia(exerciseId, linkId);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t("exercises.mediaGallery.title")}
        </Typography>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t("exercises.mediaGallery.hint")}
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => void handleUploadFiles(e.target.files)}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("exercises.mediaGallery.upload")}
          </Button>
          {loading ? (
            <CircularProgress size={28} />
          ) : items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("exercises.mediaGallery.empty")}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {items.map((row) => (
                <Card key={row.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={2}>
                      <Box sx={{ width: 120, flexShrink: 0 }}>
                        {isVideo(row.asset.content_type) ? (
                          <video
                            src={mediaSrc(row.asset.public_url)}
                            controls
                            muted
                            style={{ width: "100%", maxHeight: 90, objectFit: "cover", borderRadius: 4 }}
                          />
                        ) : (
                          <img
                            src={mediaSrc(row.asset.public_url)}
                            alt=""
                            style={{ width: "100%", maxHeight: 90, objectFit: "cover", borderRadius: 4 }}
                          />
                        )}
                      </Box>
                      <Stack spacing={1} sx={{ flex: 1, minWidth: 200 }}>
                        <Select
                          size="small"
                          value={row.role}
                          onChange={(e) => onRoleChange(row.id, e.target.value as MediaRole)}
                          sx={{ width: "100%", maxWidth: 280 }}
                        >
                          {roleOptions.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          <Button
                            size="small"
                            onClick={() => move(row.id, -1)}
                            aria-label={t("exercises.mediaGallery.moveUp")}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </Button>
                          <Button
                            size="small"
                            onClick={() => move(row.id, 1)}
                            aria-label={t("exercises.mediaGallery.moveDown")}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => onDelete(row.id)}
                            aria-label={t("exercises.mediaGallery.remove")}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </Button>
                        </Stack>
                        {row.asset.original_filename ? (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {row.asset.original_filename}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
