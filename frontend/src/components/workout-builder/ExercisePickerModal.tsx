import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";

import { WorkoutFlex as Flex } from "../WorkoutFlex";
import { BLOCK_OPTIONS } from "./constants";
import type { ExerciseOpt, PickerContext, WorkoutBlockType } from "./types";

type PickerScope = "all" | "mine" | "catalog";

export type ExercisePickerModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  catalogOptsLoaded: boolean;
  banner: PickerContext;
  scope: PickerScope;
  setScope: (s: PickerScope) => void;
  query: string;
  setQuery: (q: string) => void;
  /** Pre-grouped + filtered lists (`mine` first, then `catalog`). */
  lists: { mine: ExerciseOpt[]; catalog: ExerciseOpt[] };
  total: number;
  onAddExercise: (ex: ExerciseOpt) => void;
  /** Reset picker mode to plain "append" (cancels link/grouping mode). */
  onResetMode: () => void;
  onRefresh: () => void;
  /** Multi-select state for `groupSelect` mode (creating supersets/circuits/etc.). */
  groupSelected: ExerciseOpt[];
  onToggleGroupSelected: (ex: ExerciseOpt) => void;
  groupBlockType: WorkoutBlockType;
  setGroupBlockType: (bt: WorkoutBlockType) => void;
  onCommitGroupSelection: () => void;
  t: TFunction<"translation">;
};

export function ExercisePickerModal({
  open,
  onClose,
  loading,
  catalogOptsLoaded,
  banner,
  scope,
  setScope,
  query,
  setQuery,
  lists,
  total,
  onAddExercise,
  onResetMode,
  onRefresh,
  groupSelected,
  onToggleGroupSelected,
  groupBlockType,
  setGroupBlockType,
  onCommitGroupSelection,
  t,
}: ExercisePickerModalProps) {
  const isGroupMode = banner.mode === "groupSelect";
  const groupCount = groupSelected.length;
  const isSelected = (ex: ExerciseOpt) =>
    groupSelected.some((p) => p.id === ex.id && p.source === ex.source);

  const titleText = isGroupMode
    ? t("workouts.pickerGroupTitle") !== "workouts.pickerGroupTitle"
      ? t("workouts.pickerGroupTitle")
      : "Build a block"
    : t("workouts.pickExercise");
  const subtitleText = isGroupMode
    ? t("workouts.pickerGroupSubtitle") !== "workouts.pickerGroupSubtitle"
      ? t("workouts.pickerGroupSubtitle")
      : "Pick two or more exercises, choose the block type, then create."
    : t("workouts.pickerModalSubtitle");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="workout-items-editor__modal"
      PaperProps={{ sx: { borderRadius: "16px", maxHeight: "min(80vh, 680px)" } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--app-text-heading)",
          }}
        >
          {titleText}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, fontSize: 13, lineHeight: 1.5 }}
        >
          {subtitleText}
        </Typography>
      </DialogTitle>

      {/* Sticky group-mode toolbar: count + block-type select + Create */}
      {isGroupMode ? (
        <Box
          sx={{
            mx: 3,
            mb: 1.5,
            p: 1.25,
            borderRadius: 2,
            border: 1,
            borderColor: "primary.main",
            bgcolor: "action.selected",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
            {t("workouts.pickerGroupSelectedCount", { count: groupCount }) !==
            "workouts.pickerGroupSelectedCount"
              ? t("workouts.pickerGroupSelectedCount", { count: groupCount })
              : `${groupCount} selected`}
          </Typography>
          <Select
            size="small"
            value={groupBlockType}
            onChange={(e) => setGroupBlockType(e.target.value as WorkoutBlockType)}
            sx={{ minWidth: 150, bgcolor: "background.paper", borderRadius: "10px" }}
          >
            {BLOCK_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </MenuItem>
            ))}
          </Select>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={onResetMode}
            sx={{ color: "text.secondary" }}
          >
            {t("workouts.pickerClearMode")}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<LinkIcon fontSize="small" />}
            onClick={onCommitGroupSelection}
            disabled={groupCount < 2}
          >
            {t("workouts.pickerGroupCreate") !== "workouts.pickerGroupCreate"
              ? t("workouts.pickerGroupCreate")
              : "Create block"}
          </Button>
        </Box>
      ) : null}

      <DialogContent
        sx={{
          pt: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          id="workout-exercise-bank"
          style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
        >
          {banner.mode === "extendBlock" ? (
            <Alert
              severity="info"
              className="workout-items-editor__banner"
              sx={{ mb: 1.5 }}
              action={
                <Button size="small" onClick={onResetMode}>
                  {t("workouts.pickerClearMode")}
                </Button>
              }
            >
              {t("workouts.pickerActiveExtendBlock")}
            </Alert>
          ) : null}

          {loading && !catalogOptsLoaded ? (
            <Flex align="center" justify="center" style={{ minHeight: 160 }}>
              <CircularProgress />
            </Flex>
          ) : (
            <Stack spacing={2} sx={{ width: "100%", flex: 1, minHeight: 0 }}>
              <Flex wrap="wrap" gap={8} align="center" justify="space-between">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={scope}
                  onChange={(_, v) => v != null && setScope(v as PickerScope)}
                >
                  <ToggleButton value="all">{t("workouts.pickerScopeAll")}</ToggleButton>
                  <ToggleButton value="mine">{t("workouts.pickerScopeMine")}</ToggleButton>
                  <ToggleButton value="catalog">{t("workouts.pickerScopeCatalog")}</ToggleButton>
                </ToggleButtonGroup>
              </Flex>
              <TextField
                size="small"
                fullWidth
                placeholder={t("workouts.pickerFilterPh")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              {total > 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                  style={{ fontSize: 12 }}
                >
                  {t("workouts.pickerShowingCount", { count: total })}
                </Typography>
              ) : null}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: 380,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  paddingInlineEnd: 4,
                }}
                onWheel={(e) => e.stopPropagation()}
              >
                {total === 0 && !loading ? (
                  <Box sx={{ textAlign: "center", py: 3, opacity: 0.85 }}>
                    <Typography color="text.secondary">{t("workouts.pickerNoMatches")}</Typography>
                  </Box>
                ) : total === 0 && loading ? (
                  <Flex justify="center" style={{ padding: 24 }}>
                    <CircularProgress />
                  </Flex>
                ) : (
                  <Stack spacing={1.25} sx={{ width: "100%" }}>
                    {lists.mine.length > 0 ? (
                      <>
                        <Typography fontWeight={600} sx={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupMine")}
                        </Typography>
                        {lists.mine.map((ex) => (
                          <PickerRow
                            key={`mine-${ex.id}`}
                            exercise={ex}
                            badgeColor="success"
                            badgeLabel={t("workouts.pickerTagMine")}
                            actionLabel={t("workouts.pickerAddExercise")}
                            isGroupMode={isGroupMode}
                            selected={isSelected(ex)}
                            onToggleSelect={() => onToggleGroupSelected(ex)}
                            onAdd={() => onAddExercise(ex)}
                          />
                        ))}
                      </>
                    ) : null}
                    {lists.mine.length > 0 && lists.catalog.length > 0 ? (
                      <Divider style={{ margin: "4px 0" }} />
                    ) : null}
                    {lists.catalog.length > 0 ? (
                      <>
                        <Typography fontWeight={600} sx={{ display: "block", fontSize: 13 }}>
                          {t("workouts.pickerGroupCatalog")}
                        </Typography>
                        {lists.catalog.map((ex) => (
                          <PickerRow
                            key={`cat-${ex.id}`}
                            exercise={ex}
                            badgeColor="info"
                            badgeLabel={t("workouts.pickerBadgeCatalog")}
                            actionLabel={t("workouts.pickerAddExercise")}
                            isGroupMode={isGroupMode}
                            selected={isSelected(ex)}
                            onToggleSelect={() => onToggleGroupSelected(ex)}
                            onAdd={() => onAddExercise(ex)}
                          />
                        ))}
                      </>
                    ) : null}
                  </Stack>
                )}
              </div>
            </Stack>
          )}
        </div>
      </DialogContent>
      <DialogActions
        sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}
      >
        <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
          <Button disabled={loading} onClick={onRefresh} sx={{ borderRadius: "10px" }}>
            {t("workouts.exerciseBankRefresh")}
          </Button>
          <Button component={Link} to="/exercises/create" variant="text" sx={{ px: 0.5 }}>
            {t("workouts.quickCreateExercise")}
          </Button>
        </Stack>
        <Button
          variant={isGroupMode ? "outlined" : "contained"}
          color={isGroupMode ? "inherit" : "primary"}
          onClick={onClose}
          sx={{ borderRadius: "10px" }}
        >
          {isGroupMode
            ? t("common.cancel") !== "common.cancel"
              ? t("common.cancel")
              : "Cancel"
            : t("workouts.pickerDone")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PickerRow({
  exercise,
  badgeColor,
  badgeLabel,
  actionLabel,
  isGroupMode,
  selected,
  onToggleSelect,
  onAdd,
}: {
  exercise: ExerciseOpt;
  badgeColor: "success" | "info";
  badgeLabel: string;
  actionLabel: string;
  isGroupMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onAdd: () => void;
}) {
  const handleRowClick = () => {
    if (isGroupMode) onToggleSelect();
  };

  return (
    <Box
      role={isGroupMode ? "button" : undefined}
      tabIndex={isGroupMode ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (!isGroupMode) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 0.75,
        borderRadius: 1.5,
        cursor: isGroupMode ? "pointer" : "default",
        bgcolor: selected ? "action.selected" : "transparent",
        border: 1,
        borderColor: selected ? "primary.main" : "transparent",
        transition: "background-color 120ms, border-color 120ms",
        "&:hover": isGroupMode ? { bgcolor: "action.hover" } : undefined,
      }}
      className="workout-items-editor__picker-row"
    >
      {isGroupMode ? (
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          sx={{ p: 0.5 }}
        />
      ) : null}
      <Flex align="center" gap={10} style={{ minWidth: 0, flex: "1 1 200px" }}>
        <Typography noWrap title={exercise.name} sx={{ m: 0 }}>
          {exercise.name}
        </Typography>
        <Chip
          size="small"
          color={badgeColor}
          label={badgeLabel}
          sx={{ m: 0, fontSize: 11, height: 22, flexShrink: 0 }}
        />
      </Flex>
      {isGroupMode ? null : (
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{ borderRadius: 2, flexShrink: 0 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
