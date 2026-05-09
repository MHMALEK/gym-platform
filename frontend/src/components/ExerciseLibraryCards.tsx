import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Dumbbell, Info, Pencil, Plus, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { ExerciseRecord } from "../types/exercise";
import { ExerciseMediaPreview } from "./ExerciseMediaPreview";

export function ExerciseLibraryCards({
  rows,
  emptyText,
  action,
}: {
  rows: ExerciseRecord[];
  emptyText: string;
  action: (exercise: ExerciseRecord) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<ExerciseRecord | null>(null);

  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <Typography color="text.secondary">{emptyText}</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2,
        }}
      >
        {rows.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onOpen={() => setSelected(exercise)}
            action={action(exercise)}
          />
        ))}
      </Box>
      <ExerciseDetailDrawer exercise={selected} onClose={() => setSelected(null)} action={selected ? action(selected) : null} />
    </>
  );
}

function ExerciseCard({
  exercise,
  onOpen,
  action,
}: {
  exercise: ExerciseRecord;
  onOpen: () => void;
  action: React.ReactNode;
}) {
  const muscles = exercise.muscle_groups?.map((m) => m.label).filter(Boolean).slice(0, 3) ?? [];
  const media = exercise.demo_media_url || exercise.thumbnail_url;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderRadius: 4,
        bgcolor: "background.paper",
        transition: "160ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
      }}
    >
      <ExerciseMediaPreview url={media} title={exercise.name} compact />
      <Stack spacing={1.25} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} sx={{ lineHeight: 1.2 }} noWrap title={exercise.name}>
              {exercise.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[exercise.equipment, exercise.difficulty].filter(Boolean).join(" · ") || "Exercise"}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onOpen} aria-label="Open exercise details">
            <Info size={18} />
          </IconButton>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 40,
          }}
        >
          {exercise.description || exercise.tips || "No coaching notes yet."}
        </Typography>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {muscles.map((label) => (
            <Chip key={label} label={label} size="small" />
          ))}
          {exercise.exercise_type ? <Chip label={exercise.exercise_type} size="small" color="primary" variant="outlined" /> : null}
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <Button size="small" onClick={onOpen} startIcon={<Dumbbell size={16} />}>
            Details
          </Button>
          <Box sx={{ flex: 1 }} />
          {action}
        </Stack>
      </Stack>
    </Paper>
  );
}

function ExerciseDetailDrawer({
  exercise,
  onClose,
  action,
}: {
  exercise: ExerciseRecord | null;
  onClose: () => void;
  action: React.ReactNode;
}) {
  const media = exercise?.demo_media_url || exercise?.thumbnail_url;
  const sections = useMemo(
    () =>
      exercise
        ? [
            { title: "Instructions", items: exercise.instructions ?? [] },
            { title: "Coaching tips", text: exercise.tips },
            { title: "Common mistakes", text: exercise.common_mistakes },
            { title: "Correct form cues", text: exercise.correct_form_cues },
            { title: "Setup notes", text: exercise.setup_notes },
            { title: "Safety notes", text: exercise.safety_notes },
          ]
        : [],
    [exercise],
  );

  return (
    <Drawer anchor="right" open={!!exercise} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 } } }}>
      {exercise ? (
        <Stack spacing={2.25} sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                {exercise.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[exercise.equipment, exercise.difficulty, exercise.exercise_type].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close">
              <X size={20} />
            </IconButton>
          </Stack>

          <ExerciseMediaPreview url={media} title={exercise.name} />

          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {exercise.body_parts?.map((x) => <Chip key={x} label={x} size="small" color="primary" />)}
            {exercise.muscle_groups?.map((x) => <Chip key={x.id} label={x.label} size="small" />)}
            {exercise.secondary_muscles?.map((x) => <Chip key={x} label={x} size="small" variant="outlined" />)}
          </Stack>

          {exercise.description ? <Typography color="text.secondary">{exercise.description}</Typography> : null}

          {sections.map((section) => (
            <DetailText key={section.title} title={section.title} text={section.text} items={section.items} />
          ))}

          {exercise.video_links?.length ? (
            <>
              <Divider />
              <Typography variant="h6" fontWeight={800}>
                YouTube tutorials
              </Typography>
              {exercise.video_links.map((link) => (
                <Stack key={link.id} spacing={1}>
                  <ExerciseMediaPreview url={link.url} title={link.title ?? exercise.name} compact />
                  <Typography variant="body2" fontWeight={700}>
                    {link.title || "YouTube tutorial"}
                  </Typography>
                </Stack>
              ))}
            </>
          ) : null}

          <Stack direction="row" gap={1}>
            {action}
            {exercise.coach_id ? (
              <Button component={Link} to={`/exercises/edit/${exercise.id}`} startIcon={<Pencil size={16} />}>
                Edit
              </Button>
            ) : null}
          </Stack>
        </Stack>
      ) : null}
    </Drawer>
  );
}

function DetailText({ title, text, items }: { title: string; text?: string | null; items?: string[] }) {
  const lines = items?.length ? items : text?.split("\n").map((x) => x.trim()).filter(Boolean);
  if (!lines?.length) return null;
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" fontWeight={800}>
        {title}
      </Typography>
      <Stack component="ul" spacing={0.5} sx={{ pl: 2.5, m: 0 }}>
        {lines.map((line) => (
          <Typography key={line} component="li" variant="body2" color="text.secondary">
            {line}
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}

export function CopyExerciseButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="small" variant="contained" startIcon={<Plus size={16} />} disabled={disabled} onClick={onClick}>
      Copy
    </Button>
  );
}
