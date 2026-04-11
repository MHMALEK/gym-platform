import type { ExerciseMediaItemDTO, MediaAssetDTO, MediaRole } from "../types/media";
import { apiPrefix, authBearerHeaders, authHeaders, httpErrorFromResponse } from "./api";
import { canUseFirebaseStorage, uploadMediaViaFirebaseAndRegister } from "./firebaseStorageUpload";
import { registerRemoteMedia as registerRemoteMediaRequest } from "./mediaRegisterApi";

export type { ExerciseMediaItemDTO, MediaAssetDTO, MediaRole } from "../types/media";

async function parseErr(res: Response): Promise<never> {
  const t = await res.text();
  throw httpErrorFromResponse(res, t);
}

/** Use for <img src> / <video src> in the browser (dev proxy serves /uploads). */
export function mediaSrc(publicUrl: string): string {
  if (publicUrl.startsWith("http://") || publicUrl.startsWith("https://")) {
    return publicUrl;
  }
  return publicUrl;
}

export async function uploadMediaFile(file: File): Promise<MediaAssetDTO> {
  if (canUseFirebaseStorage()) {
    return uploadMediaViaFirebaseAndRegister(file);
  }

  const token = localStorage.getItem("access_token");
  const fd = new FormData();
  fd.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiPrefix}/media/upload`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<MediaAssetDTO>;
}

export async function registerRemoteMedia(body: {
  storage_provider: "firebase" | "external" | "s3";
  public_url: string;
  content_type: string;
  byte_size?: number;
  original_filename?: string | null;
}): Promise<MediaAssetDTO> {
  return registerRemoteMediaRequest(body);
}

export async function listExerciseMedia(exerciseId: number | string): Promise<ExerciseMediaItemDTO[]> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/media`, {
    headers: authBearerHeaders(),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseMediaItemDTO[]>;
}

export async function linkMediaToExercise(
  exerciseId: number | string,
  payload: { media_asset_id: number; role?: MediaRole; sort_order?: number | null },
): Promise<ExerciseMediaItemDTO> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/media`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      media_asset_id: payload.media_asset_id,
      role: payload.role ?? "gallery",
      sort_order: payload.sort_order ?? undefined,
    }),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseMediaItemDTO>;
}

export async function patchExerciseMediaLink(
  exerciseId: number | string,
  linkId: number,
  role: MediaRole,
): Promise<ExerciseMediaItemDTO> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/media/${linkId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseMediaItemDTO>;
}

export async function reorderExerciseMedia(
  exerciseId: number | string,
  orderedLinkIds: number[],
): Promise<ExerciseMediaItemDTO[]> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/media/order`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ ordered_link_ids: orderedLinkIds }),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseMediaItemDTO[]>;
}

export async function unlinkExerciseMedia(exerciseId: number | string, linkId: number): Promise<void> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/media/${linkId}`, {
    method: "DELETE",
    headers: authBearerHeaders(),
  });
  if (!res.ok) await parseErr(res);
}
