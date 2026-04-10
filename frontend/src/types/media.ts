export type MediaRole = "gallery" | "thumbnail" | "primary_video";

export interface MediaAssetDTO {
  id: number;
  coach_id: number;
  storage_provider: string;
  storage_path: string;
  content_type: string;
  byte_size: number;
  original_filename: string | null;
  public_url: string;
}

export interface ExerciseMediaItemDTO {
  id: number;
  exercise_id: number;
  media_asset_id: number;
  sort_order: number;
  role: MediaRole;
  asset: MediaAssetDTO;
}
