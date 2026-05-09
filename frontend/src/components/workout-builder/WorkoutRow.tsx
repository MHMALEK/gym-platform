import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Link2,
  Pencil,
  RotateCcw,
  Timer,
  Trash2,
  TimerReset,
} from "lucide-react";
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
  /** When provided, an exercise head can be collapsed (its sets hidden by parent). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /**
   * For set rows: whether the user has opened this set's inputs to
   * override the head's defaults. Default render is chip + trash only.
   */
  expanded?: boolean;
  onToggleExpanded?: () => void;
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
  collapsed,
  onToggleCollapsed,
  expanded,
  onToggleExpanded,
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
  const isHeadRow = presentation === "exercise_head";
  /** Set rows + legacy lines after the first one are visually "under" the head. */
  const isUnderHead = isSetUnder || isLegacyExtra;

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

  /** Drag handle only on bundle heads (exercise row or first legacy line) */
  const showRowDragHandle = isBundleHeadRow(items, index);
  const compactSetExerciseUi = packInExerciseGroup && isSetUnder;
  const showCompactExerciseColumn = compactSetExerciseUi || isLegacyExtra;

  // Single horizontal row. Adjacent rows in the same exercise are
  // separated only by a 1px hairline. No rail, no nested boxes.
  const style: CSSProperties = {
    background: "transparent",
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderTop:
      isHeadRow || setRunSegment === "runFirst"
        ? "none"
        : "1px solid var(--app-border)",
    borderBottom:
      isHeadRow && setCountInGroup(items, index) > 0
        ? "1px solid var(--app-border)"
        : "none",
    borderLeft: "none",
    borderRight: "none",
    borderRadius: 0,
    marginBottom: 0,
    boxShadow: "none",
  };

  const labelTiny: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    display: "block",
    marginBottom: 4,
    color: "var(--app-text-muted)",
  };

  const showLinkInRail =
    (presentation === "exercise_head" ||
      (presentation === "legacy_combined" && !isExtraSetRow)) &&
    canExtendLink;

  /** Inline action cluster — sits at the END of the head row, replacing the old left gutter. */
  const actionCluster = (
    <Flex align="center" gap={2} style={{ flexShrink: 0 }}>
      {showRowDragHandle && dragHandleProps ? (
        <Tooltip placement="top" title={t("workouts.rowToolbar.dragTooltipTitle")}>
          <IconButton
            size="small"
            aria-label={t("workouts.rowToolbar.drag")}
            sx={{
              cursor: "grab",
              borderRadius: 1.25,
              color: "text.secondary",
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical size={15} strokeWidth={2} />
          </IconButton>
        </Tooltip>
      ) : null}
      {showLinkInRail ? (
        <Tooltip title={t("workouts.linkExerciseRow")}>
          <IconButton
            size="small"
            aria-label={t("workouts.linkExerciseRow")}
            onClick={onPickExtendBlock}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <Link2 size={15} strokeWidth={2} />
          </IconButton>
        </Tooltip>
      ) : null}
      {isSetUnder && hasSetOverride ? (
        <Tooltip title={t("workouts.clearSetOverrides")}>
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
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            <RotateCcw size={15} strokeWidth={2} />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title={t("common.delete")}>
        <IconButton
          size="small"
          aria-label={t("common.delete")}
          onClick={() => removeAt(index)}
          sx={{
            color: "text.disabled",
            "&:hover": { color: "error.main", bgcolor: "action.hover" },
          }}
        >
          <Trash2 size={15} strokeWidth={2} />
        </IconButton>
      </Tooltip>
    </Flex>
  );

  /** Per-exercise collapse only makes sense for standalone heads with sets under them. */
  const showExerciseCollapse =
    presentation === "exercise_head" &&
    !insideBlock &&
    setCountInGroup(items, index) > 0 &&
    onToggleCollapsed != null;

  return (
    <div style={style}>
      <Flex align="stretch" gap={0} style={{ width: "100%" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingTop: 2,
            paddingBottom: 2,
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
          <Flex
            wrap="wrap"
            gap={8}
            align="center"
            style={{ width: "100%", rowGap: 6 }}
          >
            {presentation === "exercise_head" ? (
              <>
                {showExerciseCollapse ? (
                  <Tooltip
                    title={
                      collapsed
                        ? translate(t, "workouts.expandBlock", "Expand")
                        : translate(t, "workouts.collapseBlock", "Collapse")
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={onToggleCollapsed}
                      aria-label={collapsed ? "Expand exercise" : "Collapse exercise"}
                      sx={{
                        p: 0.5,
                        color: "text.secondary",
                        flexShrink: 0,
                        "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                      }}
                    >
                      {collapsed ? (
                        <ChevronRight size={16} strokeWidth={2} />
                      ) : (
                        <ChevronDown size={16} strokeWidth={2} />
                      )}
                    </IconButton>
                  </Tooltip>
                ) : null}
                {blockStepLabel ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      flexShrink: 0,
                      fontSize: 11,
                      fontWeight: 500,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 999,
                      bgcolor: "action.hover",
                    }}
                  >
                    {blockStepLabel}
                  </Typography>
                ) : null}
                <Typography
                  fontWeight={600}
                  sx={{
                    fontSize: 14,
                    lineHeight: 1.35,
                    letterSpacing: "-0.01em",
                    color: "text.primary",
                    minWidth: 100,
                    flex: "0 1 auto",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.exercise_name ?? `ID ${row.exercise_id}`}
                >
                  {row.exercise_name ?? `ID ${row.exercise_id}`}
                </Typography>
              </>
            ) : (
              <>
                <Chip
                  size="small"
                  color={hasSetOverride ? "warning" : "default"}
                  label={t("workouts.setNumber", {
                    n: setLabel.replace(/^\D+/, "") || setLabel,
                  })}
                  sx={{
                    flexShrink: 0,
                    minWidth: 28,
                    fontSize: 11,
                    fontWeight: 600,
                    height: 22,
                    borderRadius: 999,
                    bgcolor: hasSetOverride ? undefined : "transparent",
                    borderColor: "var(--app-border)",
                    color: hasSetOverride ? undefined : "text.secondary",
                    ml: 1.5,
                  }}
                  variant={hasSetOverride ? "filled" : "outlined"}
                />
                {!showCompactExerciseColumn ? (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 13,
                      color: "text.secondary",
                      flex: "0 1 auto",
                      minWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={row.exercise_name ?? `ID ${row.exercise_id}`}
                  >
                    {row.exercise_name ?? `ID ${row.exercise_id}`}
                  </Typography>
                ) : null}
              </>
            )}
            {/* Inputs cluster — always visible on both head and set rows. */}
            <Flex
              wrap="wrap"
              gap={6}
              align="center"
              style={{ rowGap: 6, flex: "1 1 auto", minWidth: 0 }}
            >
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{
                  width: 84,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
                }}
                placeholder={t("workouts.colReps")}
                value={displayReps ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    reps: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              {/* Hold (time-under-tension): only relevant for plank-style holds.
                  Hidden by default unless a row has data, or advanced is on. */}
              {showAdvanced || displayDur != null ? (
                <Tooltip title={translate(t, "workouts.colHoldHint", "Hold time per set (seconds)")}>
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ min: 0 }}
                    sx={{
                      width: 100,
                      "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
                    }}
                    placeholder={translate(t, "workouts.colHold", "Hold")}
                    aria-label="Hold time (seconds)"
                    value={displayDur ?? ""}
                    onChange={(e) =>
                      updateAt(index, {
                        duration_sec:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Timer size={14} strokeWidth={2} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <span style={{ fontSize: 11, opacity: 0.6 }}>s</span>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Tooltip>
              ) : null}
              <Tooltip title={translate(t, "workouts.colRestHint", "Rest between sets (seconds)")}>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: 0 }}
                  sx={{
                    width: 100,
                    "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
                  }}
                  placeholder={translate(t, "workouts.colRest", "Rest")}
                  aria-label="Rest (seconds)"
                  value={displayRest ?? ""}
                  onChange={(e) =>
                    updateAt(index, {
                      rest_sec:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimerReset size={14} strokeWidth={2} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <span style={{ fontSize: 11, opacity: 0.6 }}>s</span>
                      </InputAdornment>
                    ),
                  }}
                />
              </Tooltip>
              {showAdvanced ? (
                <>
                  <TextField
                    type="number"
                    size="small"
                    inputProps={{ min: 0, step: 0.5 }}
                    sx={{
                      width: 84,
                      "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
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
                      "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
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
                      "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
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
                  // Notes field grows to fill the rest of the row.
                  flex: "1 1 200px",
                  minWidth: 160,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 13,
                    height: 32,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                  },
                  "& .MuiOutlinedInput-input": { padding: "6px 4px" },
                }}
                placeholder={t("workouts.colTipsNotes")}
                value={displayNotes}
                onChange={(e) =>
                  updateAt(index, { notes: e.target.value || null })
                }
              />
            </Flex>
            {/* Actions live at the END of the same inline row. */}
            {actionCluster}
          </Flex>
        </div>
      </Flex>
    </div>
  );
}

function translate(t: TFunction<"translation">, key: string, fallback: string): string {
  const v = t(key);
  return v === key ? fallback : v;
}
