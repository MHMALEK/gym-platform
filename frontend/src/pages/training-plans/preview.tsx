import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PrintIcon from "@mui/icons-material/Print";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useOne } from "@refinedev/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
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
  const { t } = useTranslation();
  const [assignOpen, setAssignOpen] = useState(false);
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
        {t("trainingPlans.previewPage.invalid")}{" "}
        <Link to="/training-plans">{t("trainingPlans.previewPage.backToPlansLink")}</Link>
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
          ".training-preview-actions": { display: "none" },
          ".MuiPaper-root": { boxShadow: "none !important" },
        },
      }}
    >
      <Stack
        className="training-preview-actions"
        direction="row"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        sx={{ mb: { xs: 1.5, md: 2 } }}
      >
        <Button component={Link} to="/training-plans" startIcon={<ArrowBackIcon />} variant="text" size="small">
          {t("trainingPlans.previewPage.backToList")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<PersonAddAltOutlinedIcon />}
          onClick={() => setAssignOpen(true)}
          sx={{ textTransform: "none" }}
        >
          {t("assignPlanToClients.assignToClientsButton")}
        </Button>
        <Button
          component={Link}
          to={`/training-plans/edit/${planId}`}
          startIcon={<EditOutlinedIcon />}
          variant="outlined"
          size="small"
          sx={{ textTransform: "none" }}
        >
          {t("trainingPlans.previewPage.editWorkout")}
        </Button>
        <Button
          startIcon={<PrintIcon />}
          variant="contained"
          size="small"
          onClick={() => window.print()}
          sx={{ textTransform: "none" }}
        >
          {t("trainingPlans.previewPage.exportPdf")}
        </Button>
      </Stack>

      {query.isLoading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : query.error ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="error">{t("trainingPlans.previewPage.loadError")}</Typography>
        </Paper>
      ) : (
        <CoachingPlanPreview
          title={record?.name ?? `Workout plan #${planId}`}
          eyebrow={t("trainingPlans.shared.planPreviewEyebrow")}
          programVenue={record?.venue_type}
          workoutRichHtml={record?.workout_rich_html}
          workoutNotes={record?.description}
          workoutLines={lines}
          dietMeals={[]}
          showDiet={false}
        />
      )}

      <AssignPlanToClientsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        mode="training"
        resourceId={planId}
        resourceName={record?.name}
      />
    </Box>
  );
}
