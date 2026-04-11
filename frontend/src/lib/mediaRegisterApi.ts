import { apiPrefix, authHeaders, httpErrorFromResponse } from "./api";
import type { MediaAssetDTO } from "../types/media";

async function parseErr(res: Response): Promise<never> {
  const t = await res.text();
  throw httpErrorFromResponse(res, t);
}

export async function registerRemoteMedia(body: {
  storage_provider: "firebase" | "external" | "s3";
  public_url: string;
  content_type: string;
  byte_size?: number;
  original_filename?: string | null;
}): Promise<MediaAssetDTO> {
  const res = await fetch(`${apiPrefix}/media/register`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      ...body,
      byte_size: body.byte_size ?? 0,
    }),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<MediaAssetDTO>;
}
