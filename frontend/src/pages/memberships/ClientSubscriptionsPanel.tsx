import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useInvalidate } from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useAppMessage } from "../../lib/useAppMessage";
import { apiPrefix, authBearerHeaders, authHeaders } from "../../lib/api";
import { formatMoney } from "../../lib/money";

type PlanTemplate = {
  id: number;
  name: string;
  code?: string | null;
  duration_days: number;
  price?: number | string | null;
  discount_price?: number | string | null;
  currency?: string;
  image_url?: string | null;
};

type Sub = {
  id: number;
  plan_template_id: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
  notes?: string | null;
  plan_template: PlanTemplate | null;
};

type Props = {
  clientId: number;
  allowMutation: boolean;
  compactHeader?: boolean;
  splitLayout?: boolean;
};

type AssignFormValues = {
  plan_template_id: number | "";
  starts_at: Dayjs | null;
  ends_at: Dayjs | null;
  auto_end: boolean;
  notes: string;
};

type EditFormValues = {
  starts_at: Dayjs | null;
  ends_at: Dayjs | null;
  notes: string;
};

export function ClientSubscriptionsPanel({ clientId, allowMutation, compactHeader, splitLayout }: Props) {
  const { t, i18n } = useTranslation();
  const message = useAppMessage();
  const invalidate = useInvalidate();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Sub | null>(null);
  const loc = i18n.language;

  const assignForm = useForm<AssignFormValues>({
    defaultValues: {
      plan_template_id: "",
      starts_at: null,
      ends_at: null,
      auto_end: true,
      notes: "",
    },
  });

  const editForm = useForm<EditFormValues>({
    defaultValues: { starts_at: null, ends_at: null, notes: "" },
  });

  const { watch: watchAssign, handleSubmit: submitAssign, reset: resetAssign, setValue: setAssignValue, getValues: getAssignValues } =
    assignForm;
  const selectedTplId = watchAssign("plan_template_id");
  const startsWatch = watchAssign("starts_at");
  const autoEnd = watchAssign("auto_end");

  const formatDt = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return t("common.dash");
      return dayjs(iso).format("MMM D, YYYY h:mm A");
    },
    [t],
  );

  const refreshClientCaches = useCallback(() => {
    void invalidate({
      resource: "clients",
      invalidates: ["list", "detail"],
      id: String(clientId),
    });
    void invalidate({ resource: "invoices", invalidates: ["list"] });
  }, [invalidate, clientId]);

  /** Only `clientId` — do not list `message` / `t` (identity can churn → `useEffect([loadSubs])` loops). */
  const loadSubs = useCallback(() => {
    setLoadingSubs(true);
    void (async () => {
      try {
        const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions`, {
          headers: authBearerHeaders(),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const detail =
            typeof data === "object" && data !== null && "detail" in data
              ? String((data as { detail: unknown }).detail)
              : res.statusText;
          message.error(detail || t("memberships.panel.loadSubsError"));
          setSubs([]);
          return;
        }
        setSubs(Array.isArray(data) ? (data as Sub[]) : []);
      } catch {
        message.error(t("memberships.panel.loadSubsError"));
        setSubs([]);
      } finally {
        setLoadingSubs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- message/t omitted to avoid refetch loops
  }, [clientId]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  useEffect(() => {
    if (!allowMutation) return;
    void (async () => {
      try {
        const r = await fetch(`${apiPrefix}/plan-templates?limit=100&offset=0`, { headers: authHeaders() });
        const j = (await r.json()) as { items?: PlanTemplate[]; detail?: unknown };
        if (!r.ok) {
          const detail =
            typeof j.detail === "string"
              ? j.detail
              : Array.isArray(j.detail)
                ? JSON.stringify(j.detail)
                : r.statusText;
          message.error(detail || t("memberships.panel.loadTemplatesError"));
          setTemplates([]);
          return;
        }
        setTemplates((j.items ?? []) as PlanTemplate[]);
      } catch {
        message.error(t("memberships.panel.loadTemplatesError"));
        setTemplates([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- message/t would retrigger fetch every render
  }, [allowMutation]);

  const selectedTpl = templates.find((x) => x.id === selectedTplId);

  const assignSubscription = async (values: AssignFormValues) => {
    if (values.plan_template_id === "") return;
    if (!values.starts_at) return;
    const useDefaultEnd = values.auto_end !== false;
    const body = {
      plan_template_id: values.plan_template_id,
      starts_at: values.starts_at!.toISOString(),
      ends_at: useDefaultEnd ? null : values.ends_at ? values.ends_at.toISOString() : null,
      notes: values.notes?.trim() || null,
    };
    const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("memberships.panel.assigned"));
    resetAssign({ plan_template_id: "", starts_at: null, ends_at: null, auto_end: true, notes: "" });
    loadSubs();
    refreshClientCaches();
  };

  const applyDurationEnd = () => {
    const start = getAssignValues("starts_at") as Dayjs | null | undefined;
    const tid = getAssignValues("plan_template_id");
    const tpl = templates.find((x) => x.id === tid);
    if (!start || !tpl?.duration_days) {
      message.warning(t("memberships.panel.pickPlanFirst"));
      return;
    }
    setAssignValue("ends_at", start.add(tpl.duration_days, "day"));
    setAssignValue("auto_end", false);
  };

  const openEdit = (row: Sub) => {
    setEditing(row);
    editForm.reset({
      starts_at: row.starts_at ? dayjs(row.starts_at) : null,
      ends_at: row.ends_at ? dayjs(row.ends_at) : null,
      notes: row.notes ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = editForm.handleSubmit(async (v) => {
    if (!editing) return;
    const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions/${editing.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        starts_at: v.starts_at!.toISOString(),
        ends_at: v.ends_at ? v.ends_at.toISOString() : null,
        notes: typeof v.notes === "string" && v.notes.trim() ? v.notes.trim() : null,
      }),
    });
    if (!res.ok) {
      message.error(await res.text());
      return;
    }
    message.success(t("memberships.panel.subscriptionUpdated"));
    setEditOpen(false);
    setEditing(null);
    loadSubs();
    refreshClientCaches();
  });

  const subStatusColor = (s: string): "success" | "default" | "warning" | "info" => {
    if (s === "active") return "success";
    if (s === "cancelled" || s === "canceled") return "default";
    if (s === "expired") return "warning";
    return "info";
  };

  const renderPlanBlock = (r: Sub) => {
    const pt = r.plan_template;
    const cur = pt?.currency ?? "USD";
    const showDisc = pt?.discount_price != null && pt.discount_price !== "";
    return (
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar src={pt?.image_url || undefined} sx={{ width: 44, height: 44, flexShrink: 0 }}>
          {(pt?.name || "?").slice(0, 1).toUpperCase()}
        </Avatar>
        <Stack spacing={0.25}>
          <Typography fontWeight={600} fontSize={15}>
            {pt?.name ?? t("common.dash")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("memberships.panel.planId")} {r.plan_template_id}
            {pt?.code ? ` · ${pt.code}` : ""}
          </Typography>
          {pt ? (
            <Typography variant="caption" color="text.secondary">
              {showDisc ? (
                <Stack direction="row" spacing={0.5} component="span" alignItems="center">
                  <Box component="span" sx={{ textDecoration: "line-through" }}>
                    {formatMoney(pt.price, cur, loc)}
                  </Box>
                  <span>{formatMoney(pt.discount_price, cur, loc)}</span>
                </Stack>
              ) : (
                formatMoney(pt.price, cur, loc)
              )}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    );
  };

  const emptySubscriptions = (
    <Box
      sx={{
        py: 3.5,
        px: 2,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15, 23, 42, 0.04)",
      }}
    >
      <EventAvailableOutlinedIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1, opacity: 0.85 }} />
      <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
        {t("memberships.panel.emptyStateTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: "auto", lineHeight: 1.5 }}>
        {t("memberships.panel.emptyStateHint")}
      </Typography>
    </Box>
  );

  const summaryBlock = (
    <>
      {loadingSubs ? (
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
      ) : subs.length === 0 ? (
        emptySubscriptions
      ) : (
        <Stack spacing={2} sx={{ width: "100%", mb: splitLayout ? 0 : 1 }}>
          {subs.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent sx={{ py: 1.75, px: 2 }}>
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid size={{ xs: 12, lg: 10 }}>{renderPlanBlock(r)}</Grid>
                  <Grid size={{ xs: 12, sm: 12, lg: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t("memberships.panel.starts")}
                    </Typography>
                    <Typography variant="body2">{formatDt(r.starts_at)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, lg: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t("memberships.panel.ends")}
                    </Typography>
                    <Typography variant="body2">{formatDt(r.ends_at)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 2 }} sx={{ textAlign: { lg: "end" } }}>
                    <Chip size="small" label={r.status} color={subStatusColor(r.status)} variant="outlined" />
                  </Grid>
                  {allowMutation ? (
                    <Grid size={{ xs: 12 }} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5, mt: 0.5 }}>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Button size="small" variant="outlined" onClick={() => openEdit(r)}>
                          {t("memberships.panel.editDates")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            const ends = dayjs(r.ends_at ?? undefined).add(30, "day");
                            const res = await fetch(`${apiPrefix}/clients/${clientId}/subscriptions/${r.id}`, {
                              method: "PATCH",
                              headers: authHeaders(),
                              body: JSON.stringify({ ends_at: ends.toISOString() }),
                            });
                            if (res.ok) {
                              message.success(t("memberships.panel.extended"));
                              loadSubs();
                              refreshClientCaches();
                            } else message.error(await res.text());
                          }}
                        >
                          {t("memberships.panel.extend30")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            const res = await fetch(`${apiPrefix}/invoices/from-subscription`, {
                              method: "POST",
                              headers: authHeaders(),
                              body: JSON.stringify({ subscription_id: r.id }),
                            });
                            if (res.ok) {
                              message.success(t("memberships.panel.invoiceCreated"));
                              refreshClientCaches();
                              return;
                            }
                            message.error(await res.text());
                          }}
                        >
                          {t("memberships.panel.createInvoice")}
                        </Button>
                      </Stack>
                    </Grid>
                  ) : null}
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );

  const assignCard = (
    <Card variant="outlined" sx={splitLayout ? undefined : { mt: 2 }}>
      <CardHeader
        title={t("memberships.panel.assignTitle")}
        subheader={t("memberships.panel.assignSubheader")}
        subheaderTypographyProps={{ variant: "body2", color: "text.secondary" }}
      />
      <CardContent sx={{ pb: 2, pt: splitLayout ? 0 : undefined }}>
        <Box component="form" onSubmit={submitAssign(assignSubscription)} sx={{ maxWidth: 560 }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="sub-plan-label">{t("memberships.panel.planField")}</InputLabel>
            <Select
              labelId="sub-plan-label"
              label={t("memberships.panel.planField")}
              value={selectedTplId === "" ? "" : selectedTplId}
              onChange={(e) => {
                const v = e.target.value;
                setAssignValue("plan_template_id", v === "" ? "" : Number(v));
              }}
            >
              <MenuItem value="">
                <em>{t("memberships.panel.planPh")}</em>
              </MenuItem>
              {templates.map((tpl) => (
                <MenuItem key={tpl.id} value={tpl.id}>
                  {`${tpl.name} (#${tpl.id})${tpl.code ? ` · ${tpl.code}` : ""}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTpl ? (
            <Card variant="outlined" sx={{ mb: 2, mt: 1 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar src={selectedTpl.image_url || undefined} sx={{ width: 48, height: 48 }}>
                    {selectedTpl.name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={600}>{selectedTpl.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t("memberships.panel.templatePreview", {
                        days: selectedTpl.duration_days,
                        id: selectedTpl.id,
                        codeSuffix: selectedTpl.code ? ` · ${selectedTpl.code}` : "",
                      })}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          <DateTimePicker
            label={t("memberships.panel.start")}
            value={startsWatch}
            onChange={(v) => setAssignValue("starts_at", v)}
            slotProps={{ textField: { fullWidth: true, margin: "normal", required: true } }}
          />

          <FormControlLabel
            sx={{ mt: 1, display: "flex", alignItems: "flex-start" }}
            control={
              <Switch
                checked={autoEnd}
                onChange={(_, v) => setAssignValue("auto_end", v)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{t("memberships.panel.endMode")}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("memberships.panel.endModeExtra")}
                </Typography>
              </Box>
            }
          />

          {autoEnd === false ? (
            <DateTimePicker
              label={t("memberships.panel.customEndField")}
              value={watchAssign("ends_at")}
              onChange={(v) => setAssignValue("ends_at", v)}
              slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
            />
          ) : null}

          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2, mt: 1 }}>
            <Button type="button" variant="outlined" onClick={applyDurationEnd} disabled={!startsWatch || !selectedTpl}>
              {t("memberships.panel.setEndButton", { days: selectedTpl?.duration_days ?? "…" })}
            </Button>
          </Stack>

          <TextField
            label={t("memberships.panel.notes")}
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            placeholder={t("memberships.panel.notesPh")}
            value={watchAssign("notes")}
            onChange={(e) => setAssignValue("notes", e.target.value)}
          />

          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            {t("memberships.panel.assign")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const summarySection = splitLayout ? (
    <Card variant="outlined" sx={{ mb: 0 }}>
      <CardHeader title={t("memberships.panel.summarySectionTitle")} />
      <CardContent>{summaryBlock}</CardContent>
    </Card>
  ) : (
    summaryBlock
  );

  return (
    <section id="client-financial-subscriptions">
      {!compactHeader ? <Typography variant="h6">{t("memberships.panel.title")}</Typography> : null}
      {!allowMutation ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("memberships.panel.readOnlyHint")}{" "}
          <Link to="/clients">{t("memberships.panel.readOnlyLink")}</Link>.
        </Typography>
      ) : null}

      <Stack spacing={splitLayout ? 2 : 0} sx={{ width: "100%" }}>
        {summarySection}
        {allowMutation ? (
          <>
            {assignCard}
            <Dialog
              open={editOpen}
              onClose={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>{t("memberships.panel.modalTitle")}</DialogTitle>
              <DialogContent>
                <Box component="form" id="edit-sub-form" sx={{ pt: 1 }}>
                  <DateTimePicker
                    label={t("memberships.panel.modalStarts")}
                    value={editForm.watch("starts_at")}
                    onChange={(v) => editForm.setValue("starts_at", v)}
                    slotProps={{ textField: { fullWidth: true, margin: "normal", required: true } }}
                  />
                  <DateTimePicker
                    label={t("memberships.panel.modalEnds")}
                    value={editForm.watch("ends_at")}
                    onChange={(v) => editForm.setValue("ends_at", v)}
                    slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
                  />
                  <TextField
                    label={t("memberships.panel.modalNotes")}
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={2}
                    {...editForm.register("notes")}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setEditOpen(false);
                    setEditing(null);
                  }}
                >
                  {t("actions.cancel")}
                </Button>
                <Button variant="contained" onClick={() => void saveEdit()}>
                  {t("actions.save")}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : null}
      </Stack>
    </section>
  );
}
