import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PrintIcon from "@mui/icons-material/Print";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useOne } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";

import { CoachingPlanPreview } from "../../components/CoachingPlanPreview";
import { workoutLinesFromApiItems } from "../../lib/workoutLineModel";

export function trainingPlanPreviewPath(planId: number | string): string {
  return `/training-plans/preview/${planId}`;
}

type PlanRecord = {
  id?: number;
  name?: string;
  description?: string | null;
  workout_rich_html?: string | null;
  venue_type?: string | null;
  items?: Parameters<typeof workoutLinesFromApiItems>[0];
};

export function TrainingPlanPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const planId = id ? Number(id) : Number.NaN;
  const valid = Number.isFinite(planId);
  const query = useOne({
    resource: "training-plans",
    id: valid ? String(planId) : "",
    queryOptions: { enabled: valid },
  });
  const record = query.data?.data as PlanRecord | undefined;
  const lines = workoutLinesFromApiItems(record?.items ?? []);

  if (!valid) {
    return (
      <Typography>
        Invalid workout plan. <Link to="/training-plans">Back to workout plans</Link>
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 980,
        mx: "auto",
        px: { xs: 1, md: 1.5 },
        pb: 4,
        "@media print": {
          maxWidth: "none",
          px: 0,
          pb: 0,
          ".training-preview-actions": { display: "none" },
          ".MuiPaper-root": { boxShadow: "none !important" },
        },
      }}
    >
      <Paper
        className="training-preview-actions"
        elevation={0}
        sx={{
          p: 1,
          mb: 1.5,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Button component={Link} to="/training-plans" startIcon={<ArrowBackIcon />} variant="text" size="small">
            Back to list
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button component={Link} to={`/training-plans/edit/${planId}`} startIcon={<EditOutlinedIcon />} variant="outlined" size="small">
            Edit workout
          </Button>
          <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={() => window.print()}>
            Export PDF
          </Button>
        </Stack>
      </Paper>

      {query.isLoading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : query.error ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="error">Could not load workout preview.</Typography>
        </Paper>
      ) : (
        <CoachingPlanPreview
          title={record?.name ?? `Workout plan #${planId}`}
          eyebrow="Workout preview"
          programVenue={record?.venue_type}
          workoutRichHtml={record?.workout_rich_html}
          workoutNotes={record?.description}
          workoutLines={lines}
          dietMeals={[]}
          showDiet={false}
        />
      )}
    </Box>
  );
}
