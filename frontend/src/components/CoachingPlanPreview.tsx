import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type React from "react";

import type { DietMeal } from "../lib/nutritionTotals";
import { dayTotals, mealTotals } from "../lib/nutritionTotals";
import type { WorkoutLine } from "../lib/workoutLineModel";
import { effectiveNumeric, effectiveText, exerciseGroupRange, setOrdinalInGroup } from "../lib/workoutLineModel";
import { ExerciseMediaPreview } from "./ExerciseMediaPreview";

type WorkoutGroup = {
  key: string;
  head: WorkoutLine;
  rows: WorkoutLine[];
};

export function CoachingPlanPreview({
  clientName,
  title,
  eyebrow = "Client plan preview",
  programVenue,
  workoutRichHtml,
  workoutNotes,
  workoutLines,
  dietMeals,
  dietNotes,
  showDiet = true,
}: {
  clientName?: string | null;
  title?: string | null;
  eyebrow?: string;
  programVenue?: string | null;
  workoutRichHtml?: string | null;
  workoutNotes?: string | null;
  workoutLines: WorkoutLine[];
  dietMeals: DietMeal[];
  dietNotes?: string | null;
  showDiet?: boolean;
}) {
  const groups = workoutGroups(workoutLines);
  const totals = dayTotals(dietMeals);
  const heading = title ?? (clientName ? `${clientName}'s coaching plan` : "Coaching plan");

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "action.hover" }}>
        <Typography variant="overline" color="text.secondary">
          {eyebrow}
        </Typography>
        <Typography variant="h5" fontWeight={850}>
          {heading}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
          {programVenue ? <Chip label={`Venue: ${programVenue}`} size="small" color="primary" variant="outlined" /> : null}
          <Chip label={`${groups.length} exercises`} size="small" />
          {showDiet ? <Chip label={`${dietMeals.length} meals`} size="small" /> : null}
          {showDiet ? <Chip label={`${Math.round(totals.kcal)} kcal`} size="small" /> : null}
        </Stack>
      </Paper>

      <PreviewSection title="Workout">
        {workoutRichHtml ? (
          <Box
            className="workout-rich-preview"
            sx={{ mb: 2 }}
            dangerouslySetInnerHTML={{ __html: workoutRichHtml }}
          />
        ) : null}
        {groups.length ? (
          <Stack spacing={1.5}>
            {groups.map((group, index) => (
              <WorkoutGroupCard key={group.key} group={group} index={index} allRows={workoutLines} />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">No workout exercises yet.</Typography>
        )}
        {workoutNotes?.trim() ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={800}>
              Workout notes
            </Typography>
            <Typography whiteSpace="pre-wrap" color="text.secondary">
              {workoutNotes}
            </Typography>
          </>
        ) : null}
      </PreviewSection>

      {showDiet ? (
        <PreviewSection title="Diet">
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip label={`${Math.round(totals.kcal)} kcal`} color="primary" />
            <Chip label={`${Math.round(totals.protein_g)}g protein`} />
            <Chip label={`${Math.round(totals.carbs_g)}g carbs`} />
            <Chip label={`${Math.round(totals.fat_g)}g fat`} />
          </Stack>
          {dietMeals.length ? (
            <Stack spacing={1.5}>
              {dietMeals.map((meal, index) => {
                const mealTotal = mealTotals(meal);
                return (
                  <Paper key={`${meal.name}-${index}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography fontWeight={800} sx={{ flex: 1 }}>
                        {meal.name || `Meal ${index + 1}`}
                      </Typography>
                      <Chip label={`${Math.round(mealTotal.kcal)} kcal`} size="small" />
                      <Chip label={`${Math.round(mealTotal.protein_g)}g P`} size="small" variant="outlined" />
                      <Chip label={`${Math.round(mealTotal.carbs_g)}g C`} size="small" variant="outlined" />
                      <Chip label={`${Math.round(mealTotal.fat_g)}g F`} size="small" variant="outlined" />
                    </Stack>
                    {meal.notes ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {meal.notes}
                      </Typography>
                    ) : null}
                    {meal.foods.length ? (
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableBody>
                          {meal.foods.map((food, foodIndex) => (
                            <TableRow key={`${food.description}-${foodIndex}`}>
                              <TableCell sx={{ pl: 0 }}>{food.description || "Food"}</TableCell>
                              <TableCell align="right">{food.calories ?? "—"} kcal</TableCell>
                              <TableCell align="right">{food.protein_g ?? "—"}g P</TableCell>
                              <TableCell align="right">{food.carbs_g ?? "—"}g C</TableCell>
                              <TableCell align="right">{food.fat_g ?? "—"}g F</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : null}
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Typography color="text.secondary">No diet meals yet.</Typography>
          )}
          {dietNotes?.trim() ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                Diet notes
              </Typography>
              <Typography whiteSpace="pre-wrap" color="text.secondary">
                {dietNotes}
              </Typography>
            </>
          ) : null}
        </PreviewSection>
      ) : null}
    </Stack>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={850} sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function WorkoutGroupCard({ group, index, allRows }: { group: WorkoutGroup; index: number; allRows: WorkoutLine[] }) {
  const setRows = group.rows.filter((row) => row.row_type !== "exercise");
  const rows = setRows.length ? setRows : [group.head];
  const blockLabel = group.head.block_type ? group.head.block_type.replaceAll("_", " ") : null;
  const exercise = group.head.exercise;
  const media = exercise?.demo_media_url || exercise?.thumbnail_url;
  const coachingSections = [
    { title: "Coaching tips", text: exercise?.tips },
    { title: "Correct form cues", text: exercise?.correct_form_cues },
    { title: "Common mistakes", text: exercise?.common_mistakes },
    { title: "Setup notes", text: exercise?.setup_notes },
    { title: "Safety notes", text: exercise?.safety_notes },
  ].filter((section) => section.text?.trim());

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
        {media ? (
          <Box sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0 }}>
            <ExerciseMediaPreview url={media} title={group.head.exercise_name} compact />
          </Box>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.75 }}>
            <Typography fontWeight={850} sx={{ flex: 1 }}>
              {index + 1}. {group.head.exercise_name || `Exercise #${group.head.exercise_id}`}
            </Typography>
            {blockLabel ? <Chip size="small" color="primary" variant="outlined" label={blockLabel} /> : null}
          </Stack>
          {exercise?.description ? (
            <Typography variant="body2" color="text.secondary">
              {exercise.description}
            </Typography>
          ) : null}
          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
            {exercise?.equipment ? <Chip size="small" label={exercise.equipment} /> : null}
            {exercise?.difficulty ? <Chip size="small" label={exercise.difficulty} variant="outlined" /> : null}
          </Stack>
        </Box>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Set</TableCell>
            <TableCell>Reps / time</TableCell>
            <TableCell>Rest</TableCell>
            <TableCell>Load</TableCell>
            <TableCell>RPE</TableCell>
            <TableCell>Tempo</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const rowIndex = allRows.indexOf(row);
            const reps = effectiveNumeric(allRows, rowIndex, "reps");
            const duration = effectiveNumeric(allRows, rowIndex, "duration_sec");
            const rest = effectiveNumeric(allRows, rowIndex, "rest_sec");
            const load = effectiveNumeric(allRows, rowIndex, "weight_kg");
            const rpe = effectiveNumeric(allRows, rowIndex, "rpe");
            const tempo = effectiveText(allRows, rowIndex, "tempo");
            const notes = effectiveText(allRows, rowIndex, "notes");
            const setNo = row.row_type === "exercise" ? "All" : setOrdinalInGroup(allRows, rowIndex);
            return (
              <TableRow key={row.localId}>
                <TableCell>{setNo}</TableCell>
                <TableCell>{duration ? `${duration}s` : reps ? `${reps} reps` : "—"}</TableCell>
                <TableCell>{rest ? `${rest}s` : "—"}</TableCell>
                <TableCell>{load ? `${load} kg` : "—"}</TableCell>
                <TableCell>{rpe ?? "—"}</TableCell>
                <TableCell>{tempo || "—"}</TableCell>
                <TableCell>{notes || "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {coachingSections.length ? (
        <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
          {coachingSections.map((section) => (
            <Paper key={section.title} variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" fontWeight={850} color="text.secondary">
                {section.title}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                {section.text}
              </Typography>
            </Paper>
          ))}
        </Box>
      ) : null}
      {exercise?.video_links?.length ? (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={850}>
            Tutorial videos
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
            {exercise.video_links.map((link) => (
              <Box key={`${link.id ?? link.url}`}>
                <ExerciseMediaPreview url={link.url} title={link.title ?? group.head.exercise_name} compact />
                <Typography variant="caption" color="text.secondary">
                  {link.title || "YouTube tutorial"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      ) : null}
    </Paper>
  );
}

function workoutGroups(rows: WorkoutLine[]): WorkoutGroup[] {
  const out: WorkoutGroup[] = [];
  let i = 0;
  while (i < rows.length) {
    const [lo, hi] = exerciseGroupRange(rows, i);
    const head = rows[lo];
    if (head) {
      out.push({
        key: head.exercise_instance_id || head.localId,
        head,
        rows: rows.slice(lo, hi + 1),
      });
    }
    i = hi + 1;
  }
  return out;
}
