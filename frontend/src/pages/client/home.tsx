import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { useClientMe } from "../../contexts/ClientMeContext";
import {
  apiClientInvoices,
  apiClientPromotions,
  apiClientReminders,
  type ClientPortalInvoice,
  type ClientPromotion,
  type ClientReminder,
} from "../../lib/clientPortalApi";
import { clientReminderPath } from "../../lib/clientReminderNav";
import { formatMoney } from "../../lib/money";

export function ClientHomePage() {
  const { t, i18n } = useTranslation();
  const { me } = useClientMe();
  const [recentInvoices, setRecentInvoices] = useState<ClientPortalInvoice[]>([]);
  const [reminders, setReminders] = useState<ClientReminder[]>([]);
  const [promotions, setPromotions] = useState<ClientPromotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClientInvoices({ limit: 3 }),
      apiClientReminders(),
      apiClientPromotions(),
    ])
      .then(([invData, reminderData, promoData]) => {
        if (!cancelled) {
          setRecentInvoices(invData.items);
          setReminders(reminderData);
          setPromotions(promoData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentInvoices([]);
          setReminders([]);
          setPromotions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) return null;

  const plan = me.coaching_plan;
  const hasWorkout =
    Boolean(plan.workout_plan?.trim()) ||
    Boolean(plan.workout_rich_html?.trim()) ||
    (plan.workout_items?.length ?? 0) > 0;
  const hasDiet = Boolean(plan.diet_plan?.trim()) || (plan.diet_meals?.length ?? 0) > 0;
  const openInvoices = recentInvoices.filter((x) => x.status === "pending" || x.status === "overdue");

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">{t("clientPortal.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.welcome", { name: me.name })}
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            {t("clientPortal.yourCoach")}
          </Typography>
          <Typography variant="h6">{me.coach_name}</Typography>
          {me.coach_tagline ? (
            <Typography variant="body2" color="text.secondary">
              {me.coach_tagline}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip size="small" label={me.status} />
            <Chip size="small" label={me.account_status} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      {reminders.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t("clientPortal.remindersTitle")}
            </Typography>
            <Stack spacing={1}>
              {reminders.slice(0, 5).map((r) => (
                <Box
                  key={r.id}
                  component={RouterLink}
                  to={clientReminderPath(r)}
                  sx={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    p: 1.25,
                    borderRadius: 1,
                    border: 1,
                    borderColor: r.severity === "high" ? "error.light" : "divider",
                    bgcolor: r.severity === "high" ? "error.50" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {r.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {promotions.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">{t("clientPortal.promotionsTitle")}</Typography>
              <Button component={RouterLink} to="/client/promotions" size="small" endIcon={<ArrowForwardIcon />}>
                {t("clientPortal.viewAll")}
              </Button>
            </Stack>
            <Stack spacing={1}>
              {promotions.slice(0, 2).map((p) => (
                <Box
                  key={p.id}
                  component={RouterLink}
                  to="/client/promotions"
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {p.title}
                    </Typography>
                    {p.savings_pct ? (
                      <Chip size="small" color="success" label={t("clientPortal.savePct", { pct: p.savings_pct })} sx={{ mt: 0.5 }} />
                    ) : null}
                  </Box>
                  {p.discount_price != null ? (
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {formatMoney(p.discount_price, p.currency, i18n.language)}
                    </Typography>
                  ) : p.price != null ? (
                    <Typography variant="body2" fontWeight={600}>
                      {formatMoney(p.price, p.currency, i18n.language)}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">{t("clientPortal.myPlan")}</Typography>
            <Button component={RouterLink} to="/client/plans/workout" size="small" endIcon={<ArrowForwardIcon />}>
              {t("clientPortal.viewWorkout")}
            </Button>
          </Stack>
          {!hasWorkout && !hasDiet ? (
            <Typography variant="body2" color="text.secondary">
              {t("clientPortal.noPlanYet")}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {hasWorkout ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                  <Typography variant="body2">{t("clientPortal.workoutReady")}</Typography>
                  <Button component={RouterLink} to="/client/training/log" size="small" variant="contained">
                    {t("clientPortal.logWorkout")}
                  </Button>
                </Stack>
              ) : null}
              {hasDiet ? (
                <Button component={RouterLink} to="/client/plans/nutrition" size="small" sx={{ alignSelf: "flex-start" }}>
                  {t("clientPortal.viewNutrition")}
                </Button>
              ) : null}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">{t("clientPortal.messagesTitle")}</Typography>
            <Button component={RouterLink} to="/client/messages" size="small" endIcon={<ArrowForwardIcon />}>
              {t("clientPortal.openMessages")}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t("clientPortal.messagesTeaser")}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">{t("clientPortal.invoicesTitle")}</Typography>
            <Button component={RouterLink} to="/client/invoices" size="small" endIcon={<ArrowForwardIcon />}>
              {t("clientPortal.viewAll")}
            </Button>
          </Stack>
          {openInvoices.length > 0 ? (
            <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
              {t("clientPortal.openInvoices", { count: openInvoices.length })}
            </Typography>
          ) : null}
          {recentInvoices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("clientPortal.noInvoices")}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {recentInvoices.map((inv) => (
                <Box
                  key={inv.id}
                  component={RouterLink}
                  to={`/client/invoices/${inv.id}`}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    p: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {inv.reference ?? `#${inv.id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inv.due_date ? dayjs(inv.due_date).format("MMM D, YYYY") : t("clientPortal.noDueDate")}
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.25}>
                    <Chip size="small" label={inv.status} color={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "warning"} />
                    <Typography variant="caption">
                      {formatMoney(inv.amount, inv.currency, i18n.language)}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
