import { apiPrefix, authHeaders, httpErrorFromResponse } from "./api";
import type { ExerciseVideoLink } from "../types/exercise";

async function parseErr(res: Response): Promise<never> {
  throw httpErrorFromResponse(res, await res.text());
}

export async function createExerciseVideoLink(
  exerciseId: string | number,
  payload: Partial<ExerciseVideoLink> & { url: string },
): Promise<ExerciseVideoLink> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/video-links`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ provider: "youtube", source: "manual", ...payload }),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseVideoLink>;
}

export async function updateExerciseVideoLink(
  exerciseId: string | number,
  linkId: number,
  payload: Partial<ExerciseVideoLink>,
): Promise<ExerciseVideoLink> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/video-links/${linkId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseErr(res);
  return res.json() as Promise<ExerciseVideoLink>;
}

export async function deleteExerciseVideoLink(exerciseId: string | number, linkId: number): Promise<void> {
  const res = await fetch(`${apiPrefix}/exercises/${exerciseId}/video-links/${linkId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) await parseErr(res);
}
