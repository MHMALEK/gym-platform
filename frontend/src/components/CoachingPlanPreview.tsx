import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  Lightbulb,
  Link2,
  PlayCircle,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import type React from "react";

import type { DietMeal } from "../lib/nutritionTotals";
import { dayTotals, mealTotals } from "../lib/nutritionTotals";
import type { WorkoutBlockType, WorkoutLine } from "../lib/workoutLineModel";
import { effectiveNumeric, effectiveText, exerciseGroupRange, setOrdinalInGroup } from "../lib/workoutLineModel";
import { ExerciseMediaPreview } from "./ExerciseMediaPreview";

type WorkoutGroup = {
  key: string;
  head: WorkoutLine;
  rows: WorkoutLine[];
};

type WorkoutBlock = {
  blockId: string | null;
  blockType: WorkoutBlockType | null;
  groups: WorkoutGroup[];
};

const ACCENT = "var(--app-accent)";
const ACCENT_SOFT = "color-mix(in srgb, var(--app-accent) 14%, transparent)";
const ACCENT_FAINT = "color-mix(in srgb, var(--app-accent) 7%, transparent)";
const ACCENT_BORDER = "color-mix(in srgb, var(--app-accent) 32%, var(--app-border))";

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
  const groups = useMemo(() => workoutGroups(workoutLines), [workoutLines]);
  const totals = useMemo(() => dayTotals(dietMeals), [dietMeals]);
  const heading = title ?? (clientName ? `${clientName}'s coaching plan` : "Coaching plan");
  const totalSets = groups.reduce((sum, group) => sum + previewSetCount(group), 0);
  const videoCount = groups.reduce((sum, group) => sum + (group.head.exercise?.video_links?.length ?? 0), 0);

  const summaryParts = [
    `${groups.length} ${groups.length === 1 ? "exercise" : "exercises"}`,
    totalSets ? `${totalSets} ${totalSets === 1 ? "set" : "sets"}` : null,
    videoCount ? `${videoCount} ${videoCount === 1 ? "video" : "videos"}` : null,
    programVenue ? `Venue · ${programVenue}` : null,
    showDiet ? `${dietMeals.length} ${dietMeals.length === 1 ? "meal" : "meals"}` : null,
    showDiet && totals.kcal ? `${Math.round(totals.kcal)} kcal` : null,
  ].filter(Boolean) as string[];

  return (
    <Stack className="coaching-preview" spacing={{ xs: 2.5, md: 3 }}>
      <PlanHero eyebrow={eyebrow} title={heading} summary={summaryParts} />

      <SectionHeader
        eyebrow="Workout"
        title={groups.length ? "Today's training" : "Workout"}
        meta={`${groups.length} ${groups.length === 1 ? "exercise" : "exercises"} · ${totalSets || 0} sets`}
      />
      {workoutRichHtml ? (
        <Box
          className="workout-rich-preview"
          sx={{ color: "text.secondary" }}
          dangerouslySetInnerHTML={{ __html: workoutRichHtml }}
        />
      ) : null}
      {groups.length ? (
        <Stack spacing={1.5}>
          {(() => {
            const blocks = workoutBlocks(groups);
            let runningIndex = 0;
            return blocks.map((block) => {
              const startIndex = runningIndex;
              runningIndex += block.groups.length;
              if (block.blockId && block.groups.length > 1) {
                return (
                  <BlockCard
                    key={`block-${block.blockId}`}
                    block={block}
                    startIndex={startIndex}
                    allRows={workoutLines}
                  />
                );
              }
              return (
                <ExerciseCard
                  key={block.groups[0].key}
                  group={block.groups[0]}
                  index={startIndex}
                  allRows={workoutLines}
                />
              );
            });
          })()}
        </Stack>
      ) : (
        <EmptyState>No workout exercises yet.</EmptyState>
      )}
      {workoutNotes?.trim() ? <NoteCallout title="Workout notes" body={workoutNotes} /> : null}

      {showDiet ? (
        <>
          <SectionHeader
            eyebrow="Nutrition"
            title="Daily fuel"
            meta={`${dietMeals.length} ${dietMeals.length === 1 ? "meal" : "meals"} · ${Math.round(totals.kcal)} kcal`}
          />
          <MacroBar
            kcal={totals.kcal}
            protein={totals.protein_g}
            carbs={totals.carbs_g}
            fat={totals.fat_g}
          />
          {dietMeals.length ? (
            <Stack spacing={1.25}>
              {dietMeals.map((meal, index) => (
                <MealCard key={`${meal.name}-${index}`} meal={meal} index={index} />
              ))}
            </Stack>
          ) : (
            <EmptyState>No diet meals yet.</EmptyState>
          )}
          {dietNotes?.trim() ? <NoteCallout title="Diet notes" body={dietNotes} /> : null}
        </>
      ) : null}
    </Stack>
  );
}

function PlanHero({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: string[] }) {
  return (
    <Paper
      elevation={0}
      className="coaching-preview__hero"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 1.75,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        px: { xs: 2, md: 3 },
        py: { xs: 2.25, md: 2.75 },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          left: 0,
          width: 5,
          background: ACCENT,
          opacity: 0.95,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, var(--app-accent) 11%, transparent) 0%, transparent 55%)",
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: ACCENT,
            fontWeight: 800,
            letterSpacing: "0.14em",
            fontSize: 11,
            display: "block",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            mt: 0.25,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            fontSize: { xs: 24, md: 30 },
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
        {summary.length ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.25, fontSize: { xs: 13, md: 13.5 }, lineHeight: 1.6 }}
          >
            {summary.map((part, i) => (
              <Box component="span" key={part}>
                {i > 0 ? (
                  <Box
                    component="span"
                    sx={{
                      mx: 1,
                      color: "text.disabled",
                      "@media print": { color: "text.secondary" },
                    }}
                  >
                    ·
                  </Box>
                ) : null}
                <Box component="span">{part}</Box>
              </Box>
            ))}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

function SectionHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <Stack
      className="coaching-preview__section-head"
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      gap={{ xs: 0.5, sm: 1.5 }}
      sx={{
        position: "relative",
        pt: { xs: 1.5, md: 2 },
        pb: { xs: 1, md: 1.25 },
        borderBottom: "1px solid",
        borderColor: "divider",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: { xs: 16, md: 20 },
          bottom: { xs: 12, md: 14 },
          width: 3,
          borderRadius: 1.5,
          background: ACCENT,
        },
        pl: { xs: 1.25, md: 1.5 },
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1.25} flexWrap="wrap">
        <Typography
          variant="overline"
          sx={{
            color: ACCENT,
            fontWeight: 800,
            letterSpacing: "0.14em",
            fontSize: 10.5,
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            fontSize: { xs: 18, md: 20 },
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
      </Stack>
      {meta ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {meta}
        </Typography>
      ) : null}
    </Stack>
  );
}

function ExerciseCard({
  group,
  index,
  allRows,
}: {
  group: WorkoutGroup;
  index: number;
  allRows: WorkoutLine[];
}) {
  return (
    <Paper
      elevation={0}
      className="coaching-preview__exercise"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <ExerciseBody group={group} index={index} allRows={allRows} />
    </Paper>
  );
}

function BlockCard({
  block,
  startIndex,
  allRows,
}: {
  block: WorkoutBlock;
  startIndex: number;
  allRows: WorkoutLine[];
}) {
  const blockLabel = block.blockType ? block.blockType.replaceAll("_", " ") : "block";
  const count = block.groups.length;

  return (
    <Paper
      elevation={0}
      className="coaching-preview__block"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: ACCENT_BORDER,
        bgcolor: "background.paper",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          background: ACCENT,
          opacity: 0.95,
          zIndex: 1,
        },
      }}
    >
      <Box
        sx={{
          pl: 0.75,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1.25}
          sx={{
            px: { xs: 1.5, md: 2 },
            py: 1,
            bgcolor: ACCENT_FAINT,
            borderBottom: "1px solid",
            borderColor: ACCENT_BORDER,
          }}
        >
          <Box
            sx={{
              px: 0.85,
              py: 0.25,
              borderRadius: 0.75,
              bgcolor: ACCENT,
              color: "common.white",
              fontWeight: 900,
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {blockLabel}
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {count} exercises · perform back-to-back
          </Typography>
        </Stack>
        {block.groups.map((group, i) => (
          <Box
            key={group.key}
            sx={{
              borderBottom: i < count - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            <ExerciseBody
              group={group}
              index={startIndex + i}
              allRows={allRows}
              embedded
              memberLabel={`${i + 1} / ${count}`}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function ExerciseBody({
  group,
  index,
  allRows,
  embedded = false,
  memberLabel,
}: {
  group: WorkoutGroup;
  index: number;
  allRows: WorkoutLine[];
  embedded?: boolean;
  memberLabel?: string;
}) {
  const setRows = group.rows.filter((row) => row.row_type !== "exercise");
  const rows = setRows.length ? setRows : [group.head];
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
  const target = firstDuration != null ? `${firstDuration}s` : firstReps != null ? `${firstReps}` : "—";
  const targetSubtitle = firstDuration != null ? "hold" : firstReps != null ? "reps" : "as coached";
  const coachingSections = [
    { title: "Coaching tips", text: exercise?.tips },
    { title: "Correct form cues", text: exercise?.correct_form_cues },
    { title: "Common mistakes", text: exercise?.common_mistakes },
    { title: "Setup notes", text: exercise?.setup_notes },
    { title: "Safety notes", text: exercise?.safety_notes },
  ].filter((section) => section.text?.trim());
  const hasMore = rows.length > 1 || coachingSections.length > 0 || (exercise?.video_links?.length ?? 0) > 0;
  const numberLabel = String(index + 1).padStart(2, "0");

  const [open, setOpen] = useState(false);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems="stretch"
      sx={{ minHeight: { md: 168 } }}
    >
      {media ? (
        <Box
          className="coaching-preview__media"
          sx={{
            width: { xs: "100%", md: 220 },
            flexShrink: 0,
            position: "relative",
            display: "flex",
            overflow: "hidden",
            bgcolor: "background.default",
            aspectRatio: { xs: "16/9", md: "auto" },
            borderRight: { xs: "none", md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: "divider",
          }}
        >
          <ExerciseMediaPreview
            url={media}
            title={group.head.exercise_name}
            fit="cover"
            rounded={false}
            fill
            blendOnDark
          />
        </Box>
      ) : null}

      <Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.75, md: 2.25 } }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: 18, md: 20 },
              lineHeight: 1,
              color: ACCENT,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              flexShrink: 0,
              minWidth: 28,
            }}
          >
            {numberLabel}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 16, md: 17.5 },
                lineHeight: 1.25,
                letterSpacing: "-0.015em",
              }}
            >
              {group.head.exercise_name || `Exercise #${group.head.exercise_id}`}
            </Typography>
          </Box>
          {embedded && memberLabel ? (
            <Box
              sx={{
                px: 0.85,
                py: 0.25,
                borderRadius: 0.75,
                border: "1px solid",
                borderColor: ACCENT_BORDER,
                color: ACCENT,
                fontWeight: 800,
                fontSize: 10.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                bgcolor: ACCENT_FAINT,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {memberLabel}
            </Box>
          ) : null}
        </Stack>

        <MetricStrip
          items={[
            { label: "Sets", value: String(rows.length), strong: true },
            target !== "—" ? { label: targetSubtitle, value: target, strong: true } : null,
            firstRest != null ? { label: "Rest", value: `${firstRest}s` } : null,
            firstLoad != null ? { label: "Load", value: `${firstLoad} kg` } : null,
            firstRpe != null ? { label: "RPE", value: String(firstRpe) } : null,
            firstTempo ? { label: "Tempo", value: firstTempo } : null,
          ].filter(Boolean) as Array<{ label: string; value: string; strong?: boolean }>}
        />

        {keyCue ? (
          <Stack
            direction="row"
            gap={1}
            alignItems="flex-start"
            sx={{ mt: 1.5, color: "text.secondary" }}
          >
            <Lightbulb size={14} strokeWidth={2.2} style={{ marginTop: 3, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
              {keyCue}
            </Typography>
          </Stack>
        ) : null}

        {hasMore ? (
          <>
            <ButtonBase
              className="coaching-preview__more-toggle"
              onClick={() => setOpen((v) => !v)}
              sx={{
                mt: 1.5,
                borderRadius: 1,
                px: 0.5,
                py: 0.25,
                fontSize: 12,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: "0.02em",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box component="span">{open ? "Hide details" : "Show set-by-set & coaching notes"}</Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    transform: open ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <ChevronDown size={14} strokeWidth={2.4} />
                </Box>
              </Stack>
            </ButtonBase>
            <Collapse in={open} unmountOnExit>
              <Box className="coaching-preview__details" sx={{ mt: 1.5 }}>
                {rows.length > 1 ? (
                  <SetTable rows={rows} allRows={allRows} />
                ) : null}
                {coachingSections.length ? (
                  <Stack
                    spacing={2.25}
                    sx={{
                      mt: rows.length > 1 ? 2.25 : 0,
                      maxWidth: 760,
                    }}
                  >
                    {coachingSections.map((section) => (
                      <DetailTextSection key={section.title} title={section.title} text={section.text} />
                    ))}
                  </Stack>
                ) : null}
                {exercise?.video_links?.length ? (
                  <VideoLinks
                    links={exercise.video_links}
                    title={group.head.exercise_name}
                  />
                ) : null}
              </Box>
            </Collapse>
          </>
        ) : null}
      </Box>
    </Stack>
  );
}

function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; strong?: boolean }>;
}) {
  if (!items.length) return null;
  const xsCols = Math.min(3, items.length);
  const smCols = items.length;
  return (
    <Box
      sx={{
        mt: 1.75,
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${xsCols}, minmax(0, 1fr))`,
          sm: `repeat(${smCols}, minmax(0, 1fr))`,
        },
        rowGap: 1.5,
        columnGap: 0,
        borderTop: "1px solid",
        borderColor: "divider",
        pt: 1.5,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const isLastInXsRow = (i + 1) % xsCols === 0;
        return (
        <Box
          key={`${item.label}-${i}`}
          sx={{
            px: { xs: 0.75, sm: 1 },
            borderRight: {
              xs: isLast || isLastInXsRow ? "none" : "1px solid",
              sm: isLast ? "none" : "1px solid",
            },
            borderColor: "divider",
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontWeight: item.strong ? 900 : 800,
              fontSize: item.strong ? 16 : 14.5,
              lineHeight: 1.15,
              color: item.strong ? "text.primary" : "text.primary",
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={item.value}
          >
            {item.value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              mt: 0.25,
            }}
          >
            {item.label}
          </Typography>
        </Box>
        );
      })}
    </Box>
  );
}

function SetTable({ rows, allRows }: { rows: WorkoutLine[]; allRows: WorkoutLine[] }) {
  const cols = ["Set", "Reps / time", "Rest", "Load", "RPE", "Tempo", "Notes"];
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "60px repeat(5, minmax(72px, 1fr)) minmax(120px, 2fr)",
          bgcolor: ACCENT_FAINT,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
          "& > *": { px: 1, py: 0.65 },
          "@media (max-width: 700px)": {
            gridTemplateColumns: "48px repeat(2, minmax(0, 1fr))",
            "& > *:nth-of-type(n+4)": { display: "none" },
          },
        }}
      >
        {cols.map((c) => (
          <Box key={c}>{c}</Box>
        ))}
      </Box>
      {rows.map((row, idx) => {
        const rowIndex = allRows.indexOf(row);
        const reps = effectiveNumeric(allRows, rowIndex, "reps");
        const duration = effectiveNumeric(allRows, rowIndex, "duration_sec");
        const rest = effectiveNumeric(allRows, rowIndex, "rest_sec");
        const load = effectiveNumeric(allRows, rowIndex, "weight_kg");
        const rpe = effectiveNumeric(allRows, rowIndex, "rpe");
        const tempo = effectiveText(allRows, rowIndex, "tempo");
        const notes = effectiveText(allRows, rowIndex, "notes");
        const setNo = row.row_type === "exercise" ? "All" : setOrdinalInGroup(allRows, rowIndex);
        const targetText = duration != null ? `${duration}s hold` : reps != null ? `${reps} reps` : "—";
        return (
          <Box
            key={row.localId}
            sx={{
              display: "grid",
              gridTemplateColumns: "60px repeat(5, minmax(72px, 1fr)) minmax(120px, 2fr)",
              fontSize: 12.5,
              borderTop: idx === 0 ? "none" : "1px solid",
              borderColor: "divider",
              "& > *": { px: 1, py: 0.7 },
              "@media (max-width: 700px)": {
                gridTemplateColumns: "48px repeat(2, minmax(0, 1fr))",
                "& > *:nth-of-type(n+4)": { display: "none" },
              },
            }}
          >
            <Box sx={{ fontWeight: 900, color: "text.primary" }}>{setNo}</Box>
            <Box>{targetText}</Box>
            <Box>{rest != null ? `${rest}s` : "—"}</Box>
            <Box>{load != null ? `${load} kg` : "—"}</Box>
            <Box>{rpe ?? "—"}</Box>
            <Box>{tempo || "—"}</Box>
            <Box sx={{ color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
              {notes || "—"}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function DetailTextSection({ title, text }: { title: string; text?: string | null }) {
  const Icon = detailCardIcon(title);
  const lines = text
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const items = lines?.length ? lines : text ? [text] : [];
  if (!items.length) return null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={0.85} sx={{ mb: 0.65 }}>
        <Icon size={13} strokeWidth={2.4} color="var(--app-accent)" />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Stack
        spacing={0.4}
        sx={{ pl: { xs: 0, sm: 2.6 } }}
      >
        {items.map((line, i) => (
          <Typography
            key={`${line}-${i}`}
            variant="body2"
            color="text.primary"
            sx={{ fontSize: 13, lineHeight: 1.6 }}
          >
            {line}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

function VideoLinks({
  links,
  title,
}: {
  links: NonNullable<WorkoutLine["exercise"]>["video_links"];
  title?: string;
}) {
  if (!links?.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <PlayCircle size={14} strokeWidth={2.4} style={{ opacity: 0.85 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Tutorial videos
        </Typography>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.25 }}>
        {links.map((link) => (
          <Box key={`${link.id ?? link.url}`}>
            <ExerciseMediaPreview
              url={link.url}
              title={link.title ?? title}
              aspectRatio="16/9"
              fit="cover"
              rounded
            />
            <Stack direction="row" gap={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Link2 size={12} strokeWidth={2.2} style={{ opacity: 0.6 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
                {link.title || "YouTube tutorial"}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MacroBar({
  kcal,
  protein,
  carbs,
  fat,
}: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const macros = [
    { label: "Protein", grams: protein, color: ACCENT },
    { label: "Carbs", grams: carbs, color: "color-mix(in srgb, var(--app-accent) 50%, #38bdf8)" },
    { label: "Fat", grams: fat, color: "color-mix(in srgb, var(--app-accent) 50%, #f472b6)" },
  ];
  const totalCals = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 1.75 },
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={{ xs: 1.25, sm: 2 }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: 22, md: 26 },
              lineHeight: 1,
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(kcal)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            kcal · day
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              height: 8,
              borderRadius: 999,
              overflow: "hidden",
              bgcolor: "color-mix(in srgb, var(--app-text-muted) 12%, transparent)",
            }}
          >
            {macros.map((m) => {
              const cals = m.label === "Fat" ? m.grams * 9 : m.grams * 4;
              const pct = (cals / totalCals) * 100;
              return (
                <Box
                  key={m.label}
                  sx={{ width: `${pct}%`, bgcolor: m.color, transition: "width 0.2s ease" }}
                />
              );
            })}
          </Box>
          <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mt: 1 }}>
            {macros.map((m) => (
              <Stack key={m.label} direction="row" alignItems="center" gap={0.65}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: m.color }} />
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 11.5 }}>
                  {Math.round(m.grams)}g
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {m.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function MealCard({ meal, index }: { meal: DietMeal; index: number }) {
  const totals = mealTotals(meal);
  const numberLabel = String(index + 1).padStart(2, "0");
  return (
    <Paper
      elevation={0}
      className="coaching-preview__meal"
      sx={{
        p: { xs: 1.5, md: 1.75 },
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.25}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 16,
            lineHeight: 1,
            color: ACCENT,
            fontVariantNumeric: "tabular-nums",
            pt: 0.25,
            minWidth: 24,
          }}
        >
          {numberLabel}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "baseline" }}
            justifyContent="space-between"
            gap={{ xs: 0.5, sm: 1 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>
              {meal.name || `Meal ${index + 1}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
              {Math.round(totals.kcal)} kcal · {Math.round(totals.protein_g)}P / {Math.round(totals.carbs_g)}C / {Math.round(totals.fat_g)}F
            </Typography>
          </Stack>
          {meal.notes ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 12.5, lineHeight: 1.5 }}>
              {meal.notes}
            </Typography>
          ) : null}
          {meal.foods.length ? (
            <Box sx={{ mt: 1, display: "grid", rowGap: 0.65 }}>
              {meal.foods.map((food, foodIndex) => (
                <Box
                  key={`${food.description}-${foodIndex}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr auto", sm: "1.6fr repeat(4, minmax(54px, auto))" },
                    columnGap: 1.25,
                    rowGap: 0.25,
                    fontSize: 12.5,
                    color: "text.secondary",
                    py: 0.4,
                    borderTop: foodIndex === 0 ? "none" : "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ color: "text.primary", fontWeight: 600 }}>{food.description || "Food"}</Box>
                  <Box sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {food.calories ?? "—"} kcal
                  </Box>
                  <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
                    {food.protein_g ?? "—"}g P
                  </Box>
                  <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
                    {food.carbs_g ?? "—"}g C
                  </Box>
                  <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
                    {food.fat_g ?? "—"}g F
                  </Box>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function NoteCallout({ title, body }: { title: string; body: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 1.75 },
        borderRadius: 1.25,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: ACCENT_FAINT,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          width: 3,
          background: ACCENT,
          opacity: 0.85,
        },
      }}
    >
      <Box sx={{ pl: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: ACCENT,
            fontWeight: 800,
            letterSpacing: "0.12em",
            fontSize: 10.5,
            textTransform: "uppercase",
            display: "block",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 0.5, whiteSpace: "pre-wrap", color: "text.primary", fontSize: 13, lineHeight: 1.6 }}
        >
          {body}
        </Typography>
      </Box>
    </Paper>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        py: 3,
        px: 2,
        borderRadius: 1.25,
        border: "1px dashed",
        borderColor: "divider",
        textAlign: "center",
        color: "text.secondary",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

function detailCardIcon(title: string): LucideIcon {
  const normalized = title.toLowerCase();
  if (normalized.includes("correct")) return BadgeCheck;
  if (normalized.includes("mistake")) return AlertTriangle;
  if (normalized.includes("setup")) return Wrench;
  if (normalized.includes("safety")) return ShieldAlert;
  return Lightbulb;
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

function workoutBlocks(groups: WorkoutGroup[]): WorkoutBlock[] {
  const out: WorkoutBlock[] = [];
  for (const g of groups) {
    const bid = g.head.block_id?.trim() || null;
    const last = out[out.length - 1];
    if (bid && last && last.blockId === bid) {
      last.groups.push(g);
    } else {
      out.push({ blockId: bid, blockType: g.head.block_type, groups: [g] });
    }
  }
  return out;
}
