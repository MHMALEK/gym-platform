import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import { AlertTriangle, BadgeCheck, Lightbulb, ShieldAlert, Wrench, type LucideIcon } from "lucide-react";
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

type PrescriptionMetricItem = {
  label: string;
  value: string;
  emphasis?: boolean;
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
  const totalSets = groups.reduce((sum, group) => sum + previewSetCount(group), 0);
  const videoCount = groups.reduce((sum, group) => sum + (group.head.exercise?.video_links?.length ?? 0), 0);

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", bgcolor: "background.paper" }}>
        <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: 10 }}>
            {eyebrow}
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 0.25, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {heading}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(auto-fit, minmax(118px, 1fr))" },
            gap: 0.75,
            p: { xs: 1, md: 1.25 },
            bgcolor: "rgba(148, 163, 184, 0.06)",
          }}
        >
          <SummaryMetric label="Workout" value={`${groups.length} exercises`} />
          {totalSets ? <SummaryMetric label="Total sets" value={String(totalSets)} /> : null}
          {videoCount ? <SummaryMetric label="Videos" value={String(videoCount)} /> : null}
          {programVenue ? <SummaryMetric label="Venue" value={programVenue} /> : null}
          {showDiet ? <SummaryMetric label="Diet" value={`${dietMeals.length} meals`} /> : null}
          {showDiet ? <SummaryMetric label="Calories" value={`${Math.round(totals.kcal)} kcal`} /> : null}
        </Box>
      </Paper>

      <PreviewSection title="Workout" meta={`${groups.length} exercises · ${totalSets || 0} sets`}>
        {workoutRichHtml ? (
          <Box
            className="workout-rich-preview"
            sx={{ mb: 2, color: "text.secondary" }}
            dangerouslySetInnerHTML={{ __html: workoutRichHtml }}
          />
        ) : null}
        {groups.length ? (
          <Stack spacing={1.25}>
            {groups.map((group, index) => {
              const blockId = group.head.block_id?.trim();
              const connectsPrev = Boolean(blockId && groups[index - 1]?.head.block_id === blockId);
              const connectsNext = Boolean(blockId && groups[index + 1]?.head.block_id === blockId);
              return (
                <Box
                  key={group.key}
                  sx={{
                    position: "relative",
                    ...(connectsNext
                      ? {
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: 4,
                            height: (theme) => theme.spacing(1.25),
                            bgcolor: "primary.main",
                            opacity: 0.95,
                          },
                        }
                      : {}),
                  }}
                >
                  <WorkoutGroupCard
                    group={group}
                    index={index}
                    allRows={workoutLines}
                    connectsPrev={connectsPrev}
                    connectsNext={connectsNext}
                  />
                </Box>
              );
            })}
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
        <PreviewSection title="Diet" meta={`${dietMeals.length} meals · ${Math.round(totals.kcal)} kcal`}>
          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 1.5 }}>
            <Chip label={`${Math.round(totals.kcal)} kcal`} color="primary" size="small" />
            <Chip label={`${Math.round(totals.protein_g)}g protein`} size="small" />
            <Chip label={`${Math.round(totals.carbs_g)}g carbs`} size="small" />
            <Chip label={`${Math.round(totals.fat_g)}g fat`} size="small" />
          </Stack>
          {dietMeals.length ? (
            <Stack spacing={1}>
              {dietMeals.map((meal, index) => {
                const mealTotal = mealTotals(meal);
                return (
                  <Paper key={`${meal.name}-${index}`} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={800} sx={{ flex: 1 }}>
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
                      <Table size="small" sx={{ mt: 0.75, "& td": { py: 0.6, fontSize: 12.5 } }}>
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

function PreviewSection({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", bgcolor: "background.paper" }}>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        gap={1.5}
        sx={{ px: { xs: 1.5, md: 2 }, py: 1.15, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
          {title}
        </Typography>
        {meta ? (
          <Typography variant="caption" color="text.secondary">
            {meta}
          </Typography>
        ) : null}
      </Stack>
      <Box sx={{ p: { xs: 1.25, md: 1.5 } }}>{children}</Box>
    </Paper>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 0.85, borderRadius: 1.5, bgcolor: "background.paper" }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 10.5, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.2, mt: 0.1 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function WorkoutGroupCard({
  group,
  index,
  allRows,
  connectsPrev,
  connectsNext,
}: {
  group: WorkoutGroup;
  index: number;
  allRows: WorkoutLine[];
  connectsPrev?: boolean;
  connectsNext?: boolean;
}) {
  const setRows = group.rows.filter((row) => row.row_type !== "exercise");
  const rows = setRows.length ? setRows : [group.head];
  const blockLabel = group.head.block_type ? group.head.block_type.replaceAll("_", " ") : null;
  const exercise = group.head.exercise;
  const media = exercise?.demo_media_url || exercise?.thumbnail_url;
  const firstRowIndex = allRows.indexOf(rows[0] ?? group.head);
  const firstReps = effectiveNumeric(allRows, firstRowIndex, "reps");
  const firstDuration = effectiveNumeric(allRows, firstRowIndex, "duration_sec");
  const firstRest = effectiveNumeric(allRows, firstRowIndex, "rest_sec");
  const firstLoad = effectiveNumeric(allRows, firstRowIndex, "weight_kg");
  const firstRpe = effectiveNumeric(allRows, firstRowIndex, "rpe");
  const firstTempo = effectiveText(allRows, firstRowIndex, "tempo");
  const keyCue = firstLine(exercise?.correct_form_cues || exercise?.tips || group.head.notes);
  const target = firstDuration != null ? `${firstDuration}s hold` : firstReps != null ? `${firstReps} reps` : "As coached";
  const equipmentLine = [exercise?.equipment, exercise?.difficulty].filter(Boolean).join(" · ");
  const metrics: PrescriptionMetricItem[] = [{ label: "Sets", value: String(rows.length), emphasis: true }];
  if (firstDuration != null || firstReps != null) metrics.push({ label: "Target", value: target, emphasis: true });
  if (firstRest != null) metrics.push({ label: "Rest", value: `${firstRest}s` });
  if (firstLoad != null) metrics.push({ label: "Load", value: `${firstLoad} kg` });
  if (firstRpe != null) metrics.push({ label: "RPE", value: String(firstRpe) });
  if (firstTempo) metrics.push({ label: "Tempo", value: firstTempo });
  const coachingSections = [
    { title: "Coaching tips", text: exercise?.tips },
    { title: "Correct form cues", text: exercise?.correct_form_cues },
    { title: "Common mistakes", text: exercise?.common_mistakes },
    { title: "Setup notes", text: exercise?.setup_notes },
    { title: "Safety notes", text: exercise?.safety_notes },
  ].filter((section) => section.text?.trim());

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        overflow: "hidden",
        bgcolor: "background.paper",
        borderColor: "divider",
        borderLeft: blockLabel ? "4px solid" : undefined,
        borderLeftColor: blockLabel ? "primary.main" : undefined,
        borderTopLeftRadius: connectsPrev ? 0 : undefined,
        borderBottomLeftRadius: connectsNext ? 0 : undefined,
        boxShadow: "none",
      }}
    >
      <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.15, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" alignItems="flex-start" gap={1.25}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 850,
              fontSize: 12,
            }}
          >
            {index + 1}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              {group.head.exercise_name || `Exercise #${group.head.exercise_id}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.15 }}>
              {equipmentLine || exercise?.description ? firstLine(equipmentLine || exercise?.description) : "Workout exercise"}
            </Typography>
          </Box>
          {blockLabel ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Group: ${blockLabel}`}
              sx={{ fontWeight: 800 }}
            />
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 1.25, md: 1.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={1.25} alignItems="stretch">
          {media ? (
            <Box sx={{ width: { xs: "100%", md: 188 }, flexShrink: 0 }}>
              <ExerciseMediaPreview url={media} title={group.head.exercise_name} compact fit="cover" />
            </Box>
          ) : null}
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(6, minmax(0, 1fr))",
                },
                gap: 0.75,
              }}
            >
              {metrics.map((metric) => (
                <PrescriptionMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  emphasis={metric.emphasis}
                />
              ))}
            </Box>

            {keyCue || exercise?.description ? (
              <Paper variant="outlined" sx={{ px: 1.1, py: 0.9, borderRadius: 1.75, bgcolor: "rgba(148, 163, 184, 0.06)" }}>
                <Typography variant="caption" fontWeight={850} color="text.secondary" sx={{ fontSize: 10.5 }}>
                  {keyCue ? "Key cue" : "Overview"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.15, fontSize: 12.5, lineHeight: 1.4 }}>
                  {keyCue || firstLine(exercise?.description)}
                </Typography>
              </Paper>
            ) : null}
          </Stack>
        </Stack>

        {(rows.length > 1 || coachingSections.length || exercise?.video_links?.length) ? (
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              mt: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "transparent",
              overflow: "hidden",
              "&:before": { display: "none" },
              "&.Mui-expanded": { mt: 1 },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 38, px: 1.25, "&.Mui-expanded": { minHeight: 38 } }}>
              <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
                <Typography variant="body2" fontWeight={800}>
                  More details
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sets, coaching notes, and videos
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1.25 }}>
              {rows.length > 1 ? (
                <>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Set details
                  </Typography>
                  <SetDetailsTable rows={rows} allRows={allRows} />
                </>
              ) : null}

              {coachingSections.length ? (
                <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                  {coachingSections.map((section) => (
                    <DetailTextCard key={section.title} title={section.title} text={section.text} />
                  ))}
                </Box>
              ) : null}

              {exercise?.video_links?.length ? (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Tutorial videos
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.25 }}>
                    {exercise.video_links.map((link) => (
                      <Box key={`${link.id ?? link.url}`}>
                        <ExerciseMediaPreview url={link.url} title={link.title ?? group.head.exercise_name} compact fit="cover" />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          {link.title || "YouTube tutorial"}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : null}
            </AccordionDetails>
          </Accordion>
        ) : null}
      </Box>
    </Paper>
  );
}

function PrescriptionMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0.75,
        borderRadius: 1.5,
        bgcolor: emphasis ? "color-mix(in srgb, var(--app-accent) 12%, transparent)" : "rgba(148, 163, 184, 0.06)",
        borderColor: emphasis ? "color-mix(in srgb, var(--app-accent) 26%, var(--app-border))" : "divider",
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, fontSize: 10.5, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{ fontSize: 12.5, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={value}
      >
        {value}
      </Typography>
    </Paper>
  );
}

function DetailTextCard({ title, text }: { title: string; text?: string | null }) {
  const Icon = detailCardIcon(title);
  const lines = text
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.15,
        borderRadius: 2,
        bgcolor: "rgba(148, 163, 184, 0.045)",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 0.75 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            color: "text.secondary",
            bgcolor: "rgba(148, 163, 184, 0.10)",
            flexShrink: 0,
          }}
        >
          <Icon size={14} strokeWidth={2.2} />
        </Box>
        <Typography variant="body2" fontWeight={850} sx={{ lineHeight: 1.2 }}>
          {title}
        </Typography>
      </Stack>
      <Stack spacing={0.45}>
        {(lines?.length ? lines : text ? [text] : []).map((line) => (
          <Stack key={line} direction="row" gap={1} alignItems="flex-start">
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                mt: 0.7,
                bgcolor: "text.secondary",
                opacity: 0.55,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5, lineHeight: 1.4 }}>
              {line}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function detailCardIcon(title: string): LucideIcon {
  const normalized = title.toLowerCase();
  if (normalized.includes("correct")) {
    return BadgeCheck;
  }
  if (normalized.includes("mistake")) {
    return AlertTriangle;
  }
  if (normalized.includes("setup")) {
    return Wrench;
  }
  if (normalized.includes("safety")) {
    return ShieldAlert;
  }
  return Lightbulb;
}

function SetDetailsTable({ rows, allRows }: { rows: WorkoutLine[]; allRows: WorkoutLine[] }) {
  const values = rows.map((row) => {
    const rowIndex = allRows.indexOf(row);
    const reps = effectiveNumeric(allRows, rowIndex, "reps");
    const duration = effectiveNumeric(allRows, rowIndex, "duration_sec");
    return {
      row,
      reps,
      duration,
      rest: effectiveNumeric(allRows, rowIndex, "rest_sec"),
      load: effectiveNumeric(allRows, rowIndex, "weight_kg"),
      rpe: effectiveNumeric(allRows, rowIndex, "rpe"),
      tempo: effectiveText(allRows, rowIndex, "tempo"),
      notes: effectiveText(allRows, rowIndex, "notes"),
      setNo: row.row_type === "exercise" ? "All" : setOrdinalInGroup(allRows, rowIndex),
    };
  });
  const showReps = values.some((value) => value.reps != null || value.duration != null);
  const showRest = values.some((value) => value.rest != null);
  const showLoad = values.some((value) => value.load != null);
  const showRpe = values.some((value) => value.rpe != null);
  const showTempo = values.some((value) => value.tempo);
  const showNotes = values.some((value) => value.notes);

  return (
    <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
      <Table size="small" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 64, py: 0.65, fontSize: 12 }}>Set</TableCell>
            {showReps ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>Reps / time</TableCell> : null}
            {showRest ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>Rest</TableCell> : null}
            {showLoad ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>Load</TableCell> : null}
            {showRpe ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>RPE</TableCell> : null}
            {showTempo ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>Tempo</TableCell> : null}
            {showNotes ? <TableCell sx={{ py: 0.65, fontSize: 12 }}>Notes</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {values.map((value) => {
            return (
              <TableRow key={value.row.localId} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell sx={{ py: 0.65, fontSize: 12.5, fontWeight: 800 }}>{value.setNo}</TableCell>
                {showReps ? (
                  <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>
                    {value.duration != null ? `${value.duration}s hold` : value.reps != null ? `${value.reps} reps` : ""}
                  </TableCell>
                ) : null}
                {showRest ? <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>{value.rest != null ? `${value.rest}s` : ""}</TableCell> : null}
                {showLoad ? <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>{value.load != null ? `${value.load} kg` : ""}</TableCell> : null}
                {showRpe ? <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>{value.rpe ?? ""}</TableCell> : null}
                {showTempo ? <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>{value.tempo}</TableCell> : null}
                {showNotes ? <TableCell sx={{ py: 0.65, fontSize: 12.5 }}>{value.notes}</TableCell> : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function firstLine(value?: string | null): string | null {
  const text = value
    ?.split(/\n|•|-/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!text) return null;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
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

function previewSetCount(group: WorkoutGroup): number {
  const setRows = group.rows.filter((row) => row.row_type !== "exercise");
  return Math.max(1, setRows.length);
}
