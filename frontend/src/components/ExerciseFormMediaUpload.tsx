import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Button, Space, Typography, Upload } from "antd";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
}: ExerciseFormMediaUploadProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const asset = await uploadMediaFile(file);
      if (exerciseId && linkRole) {
        await linkMediaToExercise(exerciseId, { media_asset_id: asset.id, role: linkRole });
      }
      onChange?.(asset.public_url);
      onUploaded?.();
      options.onSuccess?.({ ok: true });
      message.success(t("exercises.form.mediaUploadSuccess"));
    } catch (e) {
      const err = e as Error;
      message.error(err.message);
      options.onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    onChange?.(null);
  };

  const url = value?.trim() || null;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {url ? (
        <div
          style={{
            border: "1px solid var(--ant-color-border, #d9d9d9)",
            borderRadius: 8,
            padding: 8,
            maxWidth: 360,
            background: "var(--ant-color-fill-quaternary, rgba(0,0,0,0.02))",
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
        </div>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {variant === "thumbnail" ? t("exercises.form.thumbnailEmpty") : t("exercises.form.demoEmpty")}
        </Typography.Text>
      )}
      <Space wrap>
        <Upload accept={accept} showUploadList={false} customRequest={handleUpload} disabled={uploading}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            {t("exercises.form.mediaChooseFile")}
          </Button>
        </Upload>
        {url ? (
          <Button icon={<DeleteOutlined />} onClick={clear}>
            {t("exercises.form.mediaRemove")}
          </Button>
        ) : null}
      </Space>
    </Space>
  );
}
