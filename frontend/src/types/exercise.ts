export type MuscleGroupRef = { id: number; code?: string; label?: string };

export type ExerciseVideoLink = {
  id: number;
  exercise_id: number;
  provider: "youtube" | string;
  url: string;
  title?: string | null;
  description?: string | null;
  sort_order: number;
  source: "manual" | "seed" | "generated" | string;
};

export type ExerciseRecord = {
  id: number;
  coach_id?: number | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  muscle_group_ids?: number[];
  muscle_groups?: MuscleGroupRef[];
  equipment?: string | null;
  venue_type?: string | null;
  tips?: string | null;
  common_mistakes?: string | null;
  correct_form_cues?: string | null;
  demo_media_url?: string | null;
  thumbnail_url?: string | null;
  external_source?: string | null;
  external_id?: string | null;
  difficulty?: string | null;
  exercise_type?: string | null;
  body_parts?: string[];
  secondary_muscles?: string[];
  instructions?: string[];
  setup_notes?: string | null;
  safety_notes?: string | null;
  source_url?: string | null;
  license_status?: string | null;
  video_links?: ExerciseVideoLink[];
};
