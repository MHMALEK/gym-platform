import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LinkIcon from "@mui/icons-material/Link";
import UndoIcon from "@mui/icons-material/Undo";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import type { CSSProperties } from "react";

import {
  effectiveNumeric,
  effectiveText,
  isBundleHeadRow,
  setCountInGroup,
} from "../../lib/workoutLineModel";
import { WorkoutFlex as Flex } from "../WorkoutFlex";
import { blockAccent } from "./helpers";
import { rowActionsRailStyle } from "./styles";
import type { DragHandleBag, RowPresentation, WorkoutLine } from "./types";

export type WorkoutRowProps = {
  row: WorkoutLine;
  index: number;
  items: WorkoutLine[];
  presentation: RowPresentation;
  insideBlock: boolean;
  packInExerciseGroup: boolean;
  blockStepLabel: string | null;
  setLabel: string;
  setRunSegment: "single" | "runFirst" | "runMiddle" | "runLast";
  canExtendLink: boolean;
  onPickExtendBlock: () => void;
  dragHandleProps?: DragHandleBag;
  /** When true, render weight/RPE/tempo inputs alongside reps/duration/rest. */
  showAdvanced: boolean;
  t: TFunction<"translation">;
  updateAt: (i: number, patch: Partial<WorkoutLine>) => void;
  removeAt: (i: number) => void;
};

/**
 * Single row in the builder: an exercise head, a set under a head, or a
 * legacy "one row per set" line. Owns its own visual variant cascade
 * (paddings, borders, rail color).
 */
export function WorkoutRow({
  row,
  index,
  items,
  presentation,
  insideBlock,
  packInExerciseGroup,
  blockStepLabel,
  setLabel,
  setRunSegment,
  canExtendLink,
  onPickExtendBlock,
  dragHandleProps,
  showAdvanced,
  t,
  updateAt,
  removeAt,
}: WorkoutRowProps) {
  const isSetUnder = presentation === "set_under";
  const isLegacyExtra =
    presentation === "legacy_combined" &&
    (setRunSegment === "runMiddle" || setRunSegment === "runLast");
  const isExtraSetRow =
    (presentation === "set_under" &&
      (setRunSegment === "runMiddle" || setRunSegment === "runLast")) ||
    isLegacyExtra;
  const rowStripe =
    insideBlock || !row.block_id
      ? "2px solid transparent"
      : `2px solid color-mix(in srgb, ${blockAccent(row.block_id)} 65%, var(--app-border))`;

  const setRail = "2px solid color-mix(in srgb, var(--app-accent) 30%, var(--app-border))";
  const headSurface = "var(--app-surface-elevated)";
  const setSurface = "var(--app-surface)";
  const headBorder = "1px solid var(--app-border)";
  const setBorder = "1px solid var(--app-border)";
  const setDividerTop = "1px solid var(--app-border)";
  const nestedBorder = "1px solid var(--app-border)";

  const displayReps = isSetUnder ? effectiveNumeric(items, index, "reps") : row.reps;
  const displayDur = isSetUnder ? effectiveNumeric(items, index, "duration_sec") : row.duration_sec;
  const displayRest = isSetUnder ? effectiveNumeric(items, index, "rest_sec") : row.rest_sec;
  const displayWeight = isSetUnder ? effectiveNumeric(items, index, "weight_kg") : row.weight_kg;
  const displayRpe = isSetUnder ? effectiveNumeric(items, index, "rpe") : row.rpe;
  const displayTempo = isSetUnder
    ? effectiveText(items, index, "tempo") ?? ""
    : row.tempo ?? "";
  const displayNotes = isSetUnder
    ? effectiveText(items, index, "notes") ?? ""
    : row.notes ?? "";

  const hasSetOverride =
    isSetUnder &&
    (row.reps != null ||
      row.duration_sec != null ||
      row.rest_sec != null ||
      row.weight_kg != null ||
      row.rpe != null ||
      (row.tempo != null && row.tempo !== "") ||
      (row.notes != null && row.notes !== ""));

  const hideBlockColumnOnRow = packInExerciseGroup && (isSetUnder || isLegacyExtra);
  /** Drag handle only on bundle heads (exercise row or first legacy line) */
  const showRowDragHandle = isBundleHeadRow(items, index);
  const compactSetExerciseUi = packInExerciseGroup && isSetUnder;
  const showCompactExerciseColumn = compactSetExerciseUi || isLegacyExtra;

  let borderRadius: string | number = 10;
  let marginTop = 0;
  let marginBottom = insideBlock ? 0 : 8;
  let paddingTop = 10;
  let paddingBottom = 10;
  let background = headSurface;
  let border = headBorder;
  let borderTop: string | undefined;
  let borderBottom: string | undefined;
  let extraPaddingLeft = 0;

  if (presentation === "exercise_head") {
    if (packInExerciseGroup && setCountInGroup(items, index) >= 1) {
      borderRadius = "12px 12px 0 0";
      marginBottom = 0;
      paddingBottom = 8;
      border = headBorder;
      borderBottom = "none";
      background = headSurface;
    } else {
      borderRadius = 12;
      marginBottom = insideBlock ? 6 : 6;
      paddingBottom = 10;
      background = headSurface;
      border = headBorder;
    }
  } else if (setRunSegment === "runFirst") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 6 : 8;
    marginBottom = packInExerciseGroup ? 0 : 4;
    paddingTop = 8;
    paddingBottom = 8;
    borderRadius = packInExerciseGroup ? 0 : 10;
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    borderTop = packInExerciseGroup ? setDividerTop : undefined;
    extraPaddingLeft = packInExerciseGroup ? 12 : 10;
  } else if (setRunSegment === "runMiddle") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 6 : 8;
    marginBottom = packInExerciseGroup ? 0 : 4;
    paddingTop = 8;
    paddingBottom = 8;
    borderRadius = packInExerciseGroup ? 0 : 10;
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    if (packInExerciseGroup) borderTop = "none";
    extraPaddingLeft = packInExerciseGroup ? 12 : 10;
  } else if (setRunSegment === "runLast") {
    marginTop = packInExerciseGroup ? 0 : insideBlock ? 6 : 8;
    marginBottom = insideBlock ? 0 : packInExerciseGroup ? 0 : 10;
    paddingTop = 8;
    paddingBottom = 10;
    borderRadius = packInExerciseGroup ? "0 0 12px 12px" : "10px 10px 12px 12px";
    background = setSurface;
    border = packInExerciseGroup ? setBorder : nestedBorder;
    if (packInExerciseGroup) borderTop = "none";
    extraPaddingLeft = packInExerciseGroup ? 12 : 10;
  } else if (
    presentation === "set_under" &&
    packInExerciseGroup &&
    setRunSegment === "single"
  ) {
    marginTop = 0;
    marginBottom = insideBlock ? 0 : 0;
    paddingTop = 8;
    paddingBottom = 10;
    borderRadius = "0 0 12px 12px";
    background = setSurface;
    border = setBorder;
    borderTop = setDividerTop;
    extraPaddingLeft = 12;
  }

  if (
    packInExerciseGroup &&
    presentation === "exercise_head" &&
    setCountInGroup(items, index) < 1
  ) {
    marginBottom = insideBlock ? 8 : 8;
  }

  if (isExtraSetRow) {
    paddingTop = Math.min(paddingTop, 12);
    paddingBottom = Math.min(paddingBottom, 12);
  }

  const style: CSSProperties = {
    borderLeft: isExtraSetRow || isLegacyExtra ? setRail : rowStripe,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop,
    paddingBottom,
    marginTop,
    marginBottom,
    background,
    border,
    ...(borderTop !== undefined ? { borderTop } : {}),
    ...(borderBottom !== undefined ? { borderBottom } : {}),
    borderRadius,
    boxShadow: undefined,
  };

  const labelTiny: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    display: "block",
    marginBottom: 4,
    color: "var(--app-text-muted)",
  };

  const contentPadLeft = 14 + extraPaddingLeft;
  const showLinkInRail =
    (presentation === "exercise_head" ||
      (presentation === "legacy_combined" && !isExtraSetRow)) &&
    canExtendLink;

  return (
    <div style={style}>
      <Flex align="stretch" gap={0} style={{ width: "100%" }}>
        <Flex
          vertical
          justify="flex-start"
          align="center"
          gap={2}
          style={rowActionsRailStyle}
        >
          {showRowDragHandle && dragHandleProps ? (
            <Tooltip
              placement="right"
              title={
                <div style={{ maxWidth: 280 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {t("workouts.rowToolbar.dragTooltipTitle")}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.92 }}>
                    {t("workouts.rowToolbar.dragTooltipBody")}
                  </div>
                </div>
              }
            >
              <IconButton
                size="small"
                aria-label={t("workouts.rowToolbar.drag")}
                sx={{
                  margin: 0,
                  cursor: "grab",
                  borderRadius: "10px",
                  color: "var(--app-text-muted)",
                  background:
                    "color-mix(in srgb, var(--app-accent) 8%, transparent)",
                }}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              >
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : showRowDragHandle ? (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          ) : (
            <div style={{ width: 32, height: 32, flexShrink: 0 }} aria-hidden />
          )}
          <Tooltip title={t("common.delete")} placement="right">
            <IconButton
              size="small"
              aria-label={t("common.delete")}
              onClick={() => removeAt(index)}
              sx={{
                color: "text.disabled",
                "&:hover": { color: "error.main", bgcolor: "action.hover" },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {showLinkInRail ? (
            <Tooltip title={t("workouts.linkExerciseRow")} placement="right">
              <IconButton
                size="small"
                aria-label={t("workouts.linkExerciseRow")}
                onClick={onPickExtendBlock}
              >
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {isSetUnder && hasSetOverride ? (
            <Tooltip title={t("workouts.clearSetOverrides")} placement="right">
              <IconButton
                size="small"
                aria-label={t("workouts.clearSetOverrides")}
                onClick={() =>
                  updateAt(index, {
                    reps: null,
                    duration_sec: null,
                    rest_sec: null,
                    weight_kg: null,
                    rpe: null,
                    tempo: null,
                    notes: null,
                  })
                }
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Flex>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingLeft: contentPadLeft,
            paddingRight: 14,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {presentation === "legacy_combined" && setRunSegment === "runFirst" ? (
            <Typography
              variant="body2"
              color="text.secondary"
              component="span"
              style={{
                display: "block",
                fontSize: 11,
                fontStyle: "italic",
                marginBottom: 8,
                opacity: 0.9,
              }}
            >
              {t("workouts.setsGroupedSubtitle")}
            </Typography>
          ) : null}
          <Flex vertical gap={8} style={{ width: "100%" }}>
            <Flex
              wrap="wrap"
              gap={8}
              align="center"
              style={{ rowGap: 8, columnGap: 10 }}
            >
              {!hideBlockColumnOnRow ? (
                <div style={{ minWidth: 100, maxWidth: 140 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    style={labelTiny}
                  >
                    {t("workouts.colBlock")}
                  </Typography>
                  {blockStepLabel ? (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 2,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        color: "var(--app-text-heading)",
                        background:
                          "color-mix(in srgb, var(--app-accent) 12%, var(--app-surface-elevated))",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      {blockStepLabel}
                    </span>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      component="span"
                      style={{ fontSize: 12 }}
                    >
                      {t("workouts.block.single")}
                    </Typography>
                  )}
                </div>
              ) : null}
              {presentation === "exercise_head" ? (
                <div
                  style={{
                    position: "relative",
                    flex: "1 1 240px",
                    minWidth: 168,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    style={labelTiny}
                  >
                    {t("workouts.colExerciseBlock")}
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{
                      fontSize: 17,
                      lineHeight: 1.35,
                      display: "block",
                      letterSpacing: "-0.02em",
                      color: "var(--app-text-heading)",
                    }}
                    noWrap
                    title={row.exercise_name ?? `ID ${row.exercise_id}`}
                  >
                    {row.exercise_name ?? `ID ${row.exercise_id}`}
                  </Typography>
                </div>
              ) : (
                <Flex
                  align="center"
                  gap={10}
                  style={{
                    flex: "1 1 240px",
                    minWidth: compactSetExerciseUi ? 96 : 188,
                  }}
                >
                  <Chip
                    size="small"
                    color={hasSetOverride ? "warning" : "default"}
                    label={t("workouts.setNumber", {
                      n: setLabel.replace(/^\D+/, "") || setLabel,
                    })}
                    sx={{
                      flexShrink: 0,
                      minWidth: 36,
                      fontSize: 11,
                      fontWeight: 600,
                      height: 22,
                      borderRadius: 999,
                      bgcolor: hasSetOverride ? undefined : "transparent",
                      borderColor: "var(--app-border)",
                      color: hasSetOverride ? undefined : "text.secondary",
                    }}
                    variant={hasSetOverride ? "filled" : "outlined"}
                  />
                  {!showCompactExerciseColumn ? (
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      sx={{
                        fontSize: 15,
                        lineHeight: 1.35,
                        display: "block",
                        minWidth: 0,
                      }}
                      noWrap
                      title={row.exercise_name ?? `ID ${row.exercise_id}`}
                    >
                      {row.exercise_name ?? `ID ${row.exercise_id}`}
                    </Typography>
                  ) : null}
                </Flex>
              )}
            </Flex>
            <Flex
              wrap="wrap"
              gap={6}
              align="center"
              style={{ width: "100%", rowGap: 6, paddingTop: 0 }}
            >
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{
                  width: 76,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                placeholder={t("workouts.colReps")}
                value={displayReps ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    reps: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{
                  width: 84,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                placeholder={t("workouts.colDurationSec")}
                value={displayDur ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    duration_sec:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{
                  width: 84,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                placeholder={t("workouts.colRestSec")}
                value={displayRest ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    rest_sec:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              {showAdvanced ? (
                <>
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ min: 0, step: 0.5 }}
                    sx={{
                      width: 84,
                      "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                    }}
                    placeholder={
                      t("workouts.colWeightKg") !== "workouts.colWeightKg"
                        ? t("workouts.colWeightKg")
                        : "kg"
                    }
                    aria-label="Weight (kg)"
                    value={displayWeight ?? ""}
                    onChange={(e) =>
                      updateAt(index, {
                        weight_kg:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ min: 0, max: 10, step: 0.5 }}
                    sx={{
                      width: 72,
                      "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                    }}
                    placeholder={
                      t("workouts.colRpe") !== "workouts.colRpe"
                        ? t("workouts.colRpe")
                        : "RPE"
                    }
                    aria-label="RPE (0–10)"
                    value={displayRpe ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        updateAt(index, { rpe: null });
                        return;
                      }
                      const n = Number(raw);
                      if (Number.isNaN(n)) return;
                      const clamped = Math.min(10, Math.max(0, n));
                      updateAt(index, { rpe: clamped });
                    }}
                  />
                  <TextField
                    size="small"
                    sx={{
                      width: 104,
                      "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                    }}
                    placeholder={
                      t("workouts.colTempo") !== "workouts.colTempo"
                        ? t("workouts.colTempo")
                        : "Tempo"
                    }
                    aria-label="Tempo (e.g. 3-1-1-0)"
                    value={displayTempo}
                    onChange={(e) =>
                      updateAt(index, { tempo: e.target.value || null })
                    }
                    inputProps={{ maxLength: 16 }}
                  />
                </>
              ) : null}
              <TextField
                size="small"
                sx={{
                  flex: "1 1 220px",
                  minWidth: 168,
                  maxWidth: 520,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                placeholder={t("workouts.colTipsNotes")}
                value={displayNotes}
                onChange={(e) =>
                  updateAt(index, { notes: e.target.value || null })
                }
              />
            </Flex>
          </Flex>
        </div>
      </Flex>
    </div>
  );
}
