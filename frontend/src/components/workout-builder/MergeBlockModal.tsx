import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";

import { BLOCK_OPTIONS } from "./constants";
import type { WorkoutBlockType } from "./types";

export type MergeBlockModalProps = {
  open: boolean;
  pickType: WorkoutBlockType;
  setPickType: (t: WorkoutBlockType) => void;
  onCancel: () => void;
  onConfirm: () => void;
  t: TFunction<"translation">;
};

/** Confirmation dialog: pick the block kind (superset / circuit / …) when grouping two exercises. */
export function MergeBlockModal({
  open,
  pickType,
  setPickType,
  onCancel,
  onConfirm,
  t,
}: MergeBlockModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      className="workout-items-editor__modal"
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <DialogTitle>{t("workouts.mergeModalTitle")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("workouts.mergeModalHint")}
        </Typography>
        <Select
          fullWidth
          size="small"
          value={pickType}
          onChange={(e) => setPickType(e.target.value as WorkoutBlockType)}
          sx={{ borderRadius: "12px" }}
        >
          {BLOCK_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {t(o.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("actions.cancel")}</Button>
        <Button variant="contained" color="primary" onClick={onConfirm}>
          {t("workouts.mergeModalOk")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
