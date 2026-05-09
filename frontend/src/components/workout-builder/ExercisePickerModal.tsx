import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";

import { WorkoutFlex as Flex } from "../WorkoutFlex";
import type { ExerciseOpt, PickerContext } from "./types";

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
  /** Reset picker mode to plain "append" (cancels link/superset arming). */
  onResetMode: () => void;
  /** Cancel a half-built superset and clean up the orphan first pick. */
  onCancelSupersetDraft: () => void;
  onRefresh: () => void;
  t: TFunction<"translation">;
};

/**
 * Modal-style exercise picker. Stateless renderer — all state lives in the
 * parent `WorkoutItemsEditor`.
 */
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
  onCancelSupersetDraft,
  onRefresh,
  t,
}: ExercisePickerModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="workout-items-editor__modal"
      PaperProps={{ sx: { borderRadius: "16px", maxHeight: "min(78vh, 640px)" } }}
    >
      <DialogTitle>
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--app-text-heading)",
          }}
        >
          {t("workouts.pickExercise")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: "block", mt: 0.75, fontSize: 13, lineHeight: 1.5 }}
        >
          {t("workouts.pickerModalSubtitle")}
        </Typography>
      </DialogTitle>
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
          {banner.mode === "newSupersetFirst" ? (
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
              {t("workouts.pickerActiveSupersetFirst")}
            </Alert>
          ) : null}
          {banner.mode === "newSupersetSecond" ? (
            <Alert
              severity="warning"
              className="workout-items-editor__banner"
              sx={{ mb: 1.5 }}
              action={
                <Button size="small" onClick={onCancelSupersetDraft}>
                  {t("workouts.cancelSupersetDraft")}
                </Button>
              }
            >
              {t("workouts.pickerActiveSupersetSecond")}
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
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={onResetMode}
                >
                  {t("workouts.addToEnd")}
                </Button>
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
              <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                  style={{ fontSize: 12 }}
                >
                  {t("workouts.pickerHint")}
                </Typography>
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
              </Flex>
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
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
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
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{ borderRadius: "10px" }}
        >
          {t("workouts.pickerDone")}
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
  onAdd,
}: {
  exercise: ExerciseOpt;
  badgeColor: "success" | "info";
  badgeLabel: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={12}
      wrap="wrap"
      className="workout-items-editor__picker-row"
    >
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
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAdd}
        style={{ borderRadius: 10 }}
      >
        {actionLabel}
      </Button>
    </Flex>
  );
}
