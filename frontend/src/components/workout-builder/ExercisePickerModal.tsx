import AddIcon from "@mui/icons-material/Add";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LinkIcon from "@mui/icons-material/Link";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";

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
  lists: { mine: ExerciseOpt[]; catalog: ExerciseOpt[] };
  total: number;
  onAddExercise: (ex: ExerciseOpt) => void;
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

export function ExercisePickerModal(props: ExercisePickerModalProps) {
  const { open, onClose, banner, t } = props;
  const isGroupMode = banner.mode === "groupSelect";
  const isExtendMode = banner.mode === "extendBlock";

  const titleText = isGroupMode
    ? translate(t, "workouts.pickerGroupTitle", "Build a block")
    : isExtendMode
      ? t("workouts.pickerActiveExtendBlock")
      : t("workouts.pickExercise");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="workout-items-editor__modal"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "min(82vh, 720px)" } }}
    >
      {/* Header: title + close */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 2.5, pt: 2, pb: 1.25 }}
      >
        <Typography
          component="h2"
          sx={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "text.primary",
            flex: 1,
          }}
        >
          {titleText}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: "text.secondary" }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {isGroupMode ? <GroupPreviewBar {...props} /> : null}

      <SearchBar {...props} />

      <ExerciseList {...props} />

      {/* Tiny utility bar — refresh as an icon only, no big buttons */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 2.5, pb: 1.5, pt: 0.5 }}
        spacing={0.5}
      >
        <Tooltip title={t("workouts.exerciseBankRefresh")}>
          <span>
            <IconButton
              size="small"
              onClick={props.onRefresh}
              disabled={props.loading}
              sx={{ color: "text.secondary" }}
              aria-label={t("workouts.exerciseBankRefresh")}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Dialog>
  );
}

/** Preview strip: shows selected exercises as removable chips + block-type + Create. */
function GroupPreviewBar({
  groupSelected,
  onToggleGroupSelected,
  groupBlockType,
  setGroupBlockType,
  onCommitGroupSelection,
  onClose,
  t,
}: ExercisePickerModalProps) {
  const count = groupSelected.length;
  const canCreate = count >= 2;

  return (
    <Box
      sx={{
        mx: 2.5,
        mb: 1.5,
        p: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: canCreate ? "primary.main" : "divider",
        bgcolor: canCreate ? "action.selected" : "action.hover",
      }}
    >
      {count === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {translate(
            t,
            "workouts.pickerGroupEmpty",
            "Pick at least two exercises below to build a block.",
          )}
        </Typography>
      ) : (
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
          {groupSelected.map((ex, idx) => (
            <Chip
              key={`${ex.source}-${ex.id}`}
              label={`${idx + 1}. ${ex.name}`}
              onDelete={() => onToggleGroupSelected(ex)}
              size="small"
              sx={{
                fontWeight: 500,
                bgcolor: "background.paper",
                borderColor: "primary.main",
                border: 1,
                borderRadius: 1.5,
                "& .MuiChip-deleteIcon": { color: "text.secondary" },
              }}
              variant="outlined"
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" alignItems="center" gap={1}>
        <Select
          size="small"
          value={groupBlockType}
          onChange={(e) => setGroupBlockType(e.target.value as WorkoutBlockType)}
          sx={{ minWidth: 140, bgcolor: "background.paper", borderRadius: 1.5 }}
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
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          {translate(t, "common.cancel", "Cancel")}
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<LinkIcon fontSize="small" />}
          onClick={onCommitGroupSelection}
          disabled={!canCreate}
        >
          {translate(t, "workouts.pickerGroupCreate", "Create block")}
        </Button>
      </Stack>
    </Box>
  );
}

function SearchBar({ scope, setScope, query, setQuery, banner, onResetMode, t }: ExercisePickerModalProps) {
  return (
    <Box sx={{ px: 2.5, mb: 1.25 }}>
      {banner.mode === "extendBlock" ? (
        <Alert
          severity="info"
          sx={{ mb: 1.25, py: 0.5, fontSize: 13 }}
          action={
            <Button size="small" onClick={onResetMode}>
              {t("workouts.pickerClearMode")}
            </Button>
          }
        >
          {t("workouts.pickerActiveExtendBlock")}
        </Alert>
      ) : null}
      <TextField
        size="small"
        fullWidth
        placeholder={t("workouts.pickerFilterPh")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 }, mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
      <Tabs
        value={scope}
        onChange={(_, v) => setScope(v as PickerScope)}
        sx={{
          minHeight: 32,
          "& .MuiTab-root": {
            minHeight: 32,
            textTransform: "none",
            fontWeight: 500,
            fontSize: 13,
            px: 1,
            py: 0.5,
          },
        }}
      >
        <Tab value="all" label={t("workouts.pickerScopeAll")} />
        <Tab value="mine" label={t("workouts.pickerScopeMine")} />
        <Tab value="catalog" label={t("workouts.pickerScopeCatalog")} />
      </Tabs>
    </Box>
  );
}

function ExerciseList({
  lists,
  total,
  loading,
  catalogOptsLoaded,
  onAddExercise,
  groupSelected,
  onToggleGroupSelected,
  banner,
  t,
}: ExercisePickerModalProps) {
  const isGroupMode = banner.mode === "groupSelect";
  const isSelected = (ex: ExerciseOpt) =>
    groupSelected.some((p) => p.id === ex.id && p.source === ex.source);

  if (loading && !catalogOptsLoaded) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: 160, px: 2.5 }}
      >
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (total === 0) {
    return (
      <Box sx={{ px: 2.5, py: 4, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          {t("workouts.pickerNoMatches")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        maxHeight: 360,
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        px: 2.5,
        pb: 1,
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {lists.mine.length > 0 ? (
        <SectionHeader>{t("workouts.pickerGroupMine")}</SectionHeader>
      ) : null}
      <Stack spacing={0.25}>
        {lists.mine.map((ex) => (
          <PickerRow
            key={`mine-${ex.id}`}
            exercise={ex}
            isGroupMode={isGroupMode}
            selected={isSelected(ex)}
            onToggleSelect={() => onToggleGroupSelected(ex)}
            onAdd={() => onAddExercise(ex)}
            actionLabel={t("workouts.pickerAddExercise")}
          />
        ))}
      </Stack>
      {lists.mine.length > 0 && lists.catalog.length > 0 ? (
        <Box sx={{ height: 12 }} />
      ) : null}
      {lists.catalog.length > 0 ? (
        <SectionHeader>{t("workouts.pickerGroupCatalog")}</SectionHeader>
      ) : null}
      <Stack spacing={0.25}>
        {lists.catalog.map((ex) => (
          <PickerRow
            key={`cat-${ex.id}`}
            exercise={ex}
            isGroupMode={isGroupMode}
            selected={isSelected(ex)}
            onToggleSelect={() => onToggleGroupSelected(ex)}
            onAdd={() => onAddExercise(ex)}
            actionLabel={t("workouts.pickerAddExercise")}
          />
        ))}
      </Stack>
    </Box>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "text.disabled",
        px: 1,
        pt: 1.25,
        pb: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

function PickerRow({
  exercise,
  isGroupMode,
  selected,
  onToggleSelect,
  onAdd,
  actionLabel,
}: {
  exercise: ExerciseOpt;
  isGroupMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onAdd: () => void;
  actionLabel: string;
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
        gap: 1,
        px: 1,
        py: 0.5,
        borderRadius: 1.5,
        cursor: isGroupMode ? "pointer" : "default",
        bgcolor: selected ? "action.selected" : "transparent",
        "&:hover": isGroupMode
          ? { bgcolor: selected ? "action.selected" : "action.hover" }
          : undefined,
      }}
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
      <Typography
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "text.primary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={exercise.name}
      >
        {exercise.name}
      </Typography>
      {!isGroupMode ? (
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onAdd}
          sx={{
            color: "primary.main",
            fontWeight: 600,
            textTransform: "none",
            minWidth: 0,
            px: 1.25,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}

function translate(t: TFunction<"translation">, key: string, fallback: string): string {
  const v = t(key);
  return v === key ? fallback : v;
}
