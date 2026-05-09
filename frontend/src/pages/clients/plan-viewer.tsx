import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailIcon from "@mui/icons-material/Email";
import PrintIcon from "@mui/icons-material/Print";
import SendIcon from "@mui/icons-material/Send";
import ShareIcon from "@mui/icons-material/Share";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { CoachingPlanPreview } from "../../components/CoachingPlanPreview";
import { apiPrefix, authHeaders } from "../../lib/api";
import { dietMealsFromApi, type DietMeal } from "../../lib/nutritionTotals";
import { workoutLinesFromApiItems } from "../../lib/workoutLineModel";
import type { CoachingPayload } from "./ClientCoachingPlansEditor";

type ClientRecord = { id: number; name?: string; email?: string | null };

export function ClientPlanViewerPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = id ? Number(id) : Number.NaN;
  const valid = Number.isFinite(clientId);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [payload, setPayload] = useState<CoachingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const [clientRes, planRes] = await Promise.all([
        fetch(`${apiPrefix}/clients/${clientId}`, { headers: authHeaders() }),
        fetch(`${apiPrefix}/clients/${clientId}/coaching-plans`, { headers: authHeaders() }),
      ]);
      if (!clientRes.ok) throw new Error(await clientRes.text());
      if (!planRes.ok) throw new Error(await planRes.text());
      const clientJson = await clientRes.json();
      setClient((clientJson.client ?? clientJson) as ClientRecord);
      setPayload((await planRes.json()) as CoachingPayload);
    } catch (e) {
      setError((e as Error).message || "Could not load plan preview.");
    } finally {
      setLoading(false);
    }
  }, [clientId, valid]);

  useEffect(() => {
    void load();
  }, [load]);

  const share = useMemo(() => {
    const title = `${client?.name ?? "Client"} workout and diet plan`;
    const url = window.location.href;
    const text = `Open ${title}: ${url}`;
    return { title, url, text };
  }, [client?.name]);

  const lines = useMemo(() => workoutLinesFromApiItems(payload?.workout_items ?? []), [payload?.workout_items]);
  const meals = useMemo<DietMeal[]>(() => dietMealsFromApi(payload?.diet_meals ?? []), [payload?.diet_meals]);

  const nativeShare = async () => {
    if (!navigator.share) {
      await navigator.clipboard?.writeText(share.url);
      return;
    }
    await navigator.share(share);
  };

  if (!valid) {
    return (
      <Typography>
        Invalid client. <Link to="/clients">Back to clients</Link>
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        mx: 0,
        px: 0,
        pt: { xs: 0.5, md: 0.75 },
        pb: { xs: 2, md: 3 },
        "@media print": {
          pt: 0,
          pb: 0,
          ".viewer-actions": { display: "none" },
          ".MuiPaper-root": { boxShadow: "none !important" },
        },
      }}
    >
      <Stack
        className="viewer-actions"
        direction="row"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        sx={{ mb: { xs: 1.5, md: 2 } }}
      >
        <Button component={Link} to={`/clients/show/${clientId}/workout-diet-plans`} startIcon={<ArrowBackIcon />} variant="text" size="small">
          Back to editor
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={() => window.print()}>
          Export PDF
        </Button>
        <Button startIcon={<ShareIcon />} variant="outlined" size="small" onClick={() => void nativeShare()}>
          Share
        </Button>
        <Button
          startIcon={<WhatsAppIcon />}
          variant="outlined"
          size="small"
          component="a"
          href={`https://wa.me/?text=${encodeURIComponent(share.text)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </Button>
        <Button
          startIcon={<SendIcon />}
          variant="outlined"
          size="small"
          component="a"
          href={`https://t.me/share/url?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.title)}`}
          target="_blank"
          rel="noreferrer"
        >
          Telegram
        </Button>
        <Button
          startIcon={<EmailIcon />}
          variant="outlined"
          size="small"
          component="a"
          href={`mailto:${client?.email ?? ""}?subject=${encodeURIComponent(share.title)}&body=${encodeURIComponent(share.text)}`}
        >
          Email
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <CoachingPlanPreview
          clientName={client?.name ?? `Client #${clientId}`}
          programVenue={payload?.program_venue}
          workoutRichHtml={payload?.workout_rich_html}
          workoutNotes={payload?.workout_plan}
          workoutLines={lines}
          dietMeals={meals}
          dietNotes={payload?.diet_plan}
        />
      )}
    </Box>
  );
}
