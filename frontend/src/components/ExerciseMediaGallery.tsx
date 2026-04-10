import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Card, Select, Space, Spin, Typography, Upload, message } from "antd";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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

export function ExerciseMediaGallery({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation();
  const eidNum = Number(exerciseId);
  const [items, setItems] = useState<ExerciseMediaItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
  }, [exerciseId, eidNum]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const asset = await uploadMediaFile(file);
      await linkMediaToExercise(exerciseId, { media_asset_id: asset.id, role: "gallery" });
      options.onSuccess?.({ ok: true });
      await load();
    } catch (e) {
      const err = e as Error;
      options.onError?.(err);
      message.error(err.message);
    } finally {
      setUploading(false);
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
    [nextIds[idx], nextIds[j]] = [nextIds[j], nextIds[idx]];
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
    <Card title={t("exercises.mediaGallery.title")} style={{ marginTop: 24 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Typography.Text type="secondary">{t("exercises.mediaGallery.hint")}</Typography.Text>
        <Upload
          accept={ACCEPT}
          multiple
          customRequest={handleUpload}
          showUploadList={false}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {t("exercises.mediaGallery.upload")}
          </Button>
        </Upload>
        {loading ? (
          <Spin />
        ) : items.length === 0 ? (
          <Typography.Text type="secondary">{t("exercises.mediaGallery.empty")}</Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            {items.map((row) => (
              <Card key={row.id} size="small" styles={{ body: { padding: 12 } }}>
                <Space align="start" wrap>
                  <div style={{ width: 120, flexShrink: 0 }}>
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
                  </div>
                  <Space direction="vertical" style={{ flex: 1, minWidth: 200 }}>
                    <Select
                      value={row.role}
                      options={roleOptions}
                      style={{ width: "100%", maxWidth: 280 }}
                      onChange={(v) => onRoleChange(row.id, v as MediaRole)}
                    />
                    <Space>
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        onClick={() => move(row.id, -1)}
                        aria-label={t("exercises.mediaGallery.moveUp")}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        onClick={() => move(row.id, 1)}
                        aria-label={t("exercises.mediaGallery.moveDown")}
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(row.id)}
                        aria-label={t("exercises.mediaGallery.remove")}
                      />
                    </Space>
                    {row.asset.original_filename ? (
                      <Typography.Text type="secondary" ellipsis>
                        {row.asset.original_filename}
                      </Typography.Text>
                    ) : null}
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  );
}
