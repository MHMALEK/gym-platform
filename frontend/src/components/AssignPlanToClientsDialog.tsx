import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type BaseRecord, useList } from "@refinedev/core";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { apiPrefix, authHeaders } from "../lib/api";
import { REFINE_LIST_FIRST_PAGE_200_SERVER } from "../lib/refineListPagination";
import { assignNutritionTemplateToClients, assignTrainingPlanToClients } from "../lib/coachingPlanApply";
import { useAppMessage } from "../lib/useAppMessage";

export type AssignPlanMode = "training" | "nutrition";

type ClientOption = { id: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: AssignPlanMode;
  /** Training plan id or nutrition template id */
  resourceId: number;
  resourceName?: string;
};

export function AssignPlanToClientsDialog({ open, onClose, mode, resourceId, resourceName }: Props) {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [selected, setSelected] = useState<ClientOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useList({
    resource: "clients",
    pagination: REFINE_LIST_FIRST_PAGE_200_SERVER,
    queryOptions: { enabled: open },
  });

  const options = useMemo(() => {
    const rows = (data?.data ?? []) as BaseRecord[];
    return rows
      .map((r) => {
        const id = Number(r.id);
        if (!Number.isFinite(id)) return null;
        const label = String(r.name ?? "").trim() || `#${id}`;
        return { id, label };
      })
      .filter((x): x is ClientOption => x != null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data?.data]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setSelected([]);
    onClose();
  }, [onClose, submitting]);

  const handleSubmit = useCallback(async () => {
    const ids = selected.map((s) => s.id);
    if (ids.length === 0) {
      message.error(t("assignPlanToClients.noClients"));
      return;
    }
    setSubmitting(true);
    try {
      const result =
        mode === "training"
          ? await assignTrainingPlanToClients(resourceId, ids, apiPrefix, authHeaders)
          : await assignNutritionTemplateToClients(resourceId, ids, apiPrefix, authHeaders);
      if (!result.ok) {
        message.error("message" in result ? result.message : t("assignPlanToClients.failed"));
        return;
      }
      message.success(t("assignPlanToClients.success", { count: ids.length }));
      setSelected([]);
      onClose();
    } catch {
      message.error(t("assignPlanToClients.failed"));
    } finally {
      setSubmitting(false);
    }
  }, [message, mode, onClose, resourceId, selected, t]);

  const title =
    mode === "training"
      ? t("assignPlanToClients.titleTraining")
      : t("assignPlanToClients.titleNutrition");

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {resourceName ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("assignPlanToClients.resourceLabel")}: <strong>{resourceName}</strong>
          </Typography>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("assignPlanToClients.hint")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("assignPlanToClients.manageClientsHint")}{" "}
          <Link component={RouterLink} to="/clients" underline="hover">
            {t("assignPlanToClients.manageClientsLink")}
          </Link>
          .
        </Typography>
        {isLoading ? (
          <CircularProgress size={28} />
        ) : (
          <Autocomplete
            multiple
            options={options}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("assignPlanToClients.clientsLabel")}
                placeholder={t("assignPlanToClients.clientsPlaceholder")}
              />
            )}
            disableCloseOnSelect
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t("actions.cancel")}
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting || selected.length === 0}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : t("assignPlanToClients.assign")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
