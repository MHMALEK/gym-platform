import { apiPrefix, authHeaders, httpErrorFromResponse } from "./api";

export type CoachProfilePatch = {
  name?: string;
  tagline?: string | null;
  primary_color?: string | null;
  logo_media_asset_id?: number | null;
};

export async function patchCoachProfile(body: CoachProfilePatch): Promise<void> {
  const res = await fetch(`${apiPrefix}/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw httpErrorFromResponse(res, await res.text());
}
