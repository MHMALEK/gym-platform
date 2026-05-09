import GroupAddIcon from "@mui/icons-material/GroupAddRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useForm } from "@refinedev/react-hook-form";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
import { PageHeader } from "../../components/layout/PageHeader";
import { StickyActionBar } from "../../components/layout/StickyActionBar";
import {
  WorkoutItemsEditor,
  workoutLinesFromApiItems,
} from "../../components/WorkoutItemsEditor";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type Item = {
  id: number;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  weight_kg?: number | null;
  rpe?: number | null;
  tempo?: string | null;
  notes: string | null;
  block_id?: string | null;
  block_type?: string | null;
  block_sequence?: number | null;
  exercise?: { id: number; name: string };
};

type PlanRecord = {
  id?: number;
  name?: string;
  venue_type?: string;
  workout_rich_html?: string | null;
  items?: Item[];
};

type FormValues = {
  name: string;
  description?: string;
  venue_type: string;
  workout_rich_html: string;
};

// Pages stretch to fill the AppShell content area. The shell itself caps
// the visible width via its own px padding; nothing else clamps content.
const PAGE_MAX_WIDTH = "100%";

export function TrainingPlanEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);
  const [tab, setTab] = useState<0 | 1>(0);
  const { control, saveButtonProps, watch, refineCore } = useForm<FormValues>({
    refineCoreProps: { resource: "training-plans" },
  });
  const query = refineCore.query;
  const record = query?.data?.data as PlanRecord | undefined;

  const initialLines = useMemo(
    () => workoutLinesFromApiItems(record?.items ?? []),
    [record?.items],
  );

  const venueLive = watch("venue_type") ?? record?.venue_type ?? "mixed";

  const headerActions = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<GroupAddIcon fontSize="small" />}
      disabled={record?.id == null}
      onClick={() => setAssignOpen(true)}
      sx={{ borderRadius: 2 }}
    >
      {t("assignPlanToClients.assignToClientsButton")}
    </Button>
  );

  const cancelLabel =
    t("common.cancel") !== "common.cancel" ? t("common.cancel") : "Cancel";
  const saveLabel =
    t("trainingPlans.create.savePlan") !== "trainingPlans.create.savePlan"
      ? t("trainingPlans.create.savePlan")
      : "Save";

  return (
    <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
      <PageHeader
        title={record?.name || t("trainingPlans.edit.pageTitle") || "Training plan"}
        subtitle={t("trainingPlans.edit.pageSubtitle") !== "trainingPlans.edit.pageSubtitle" ? t("trainingPlans.edit.pageSubtitle") : undefined}
        actions={headerActions}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as 0 | 1)}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
          minHeight: 40,
          "& .MuiTab-root": {
            minHeight: 40,
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            px: 1.5,
          },
        }}
      >
        <Tab label={t("trainingPlans.create.stepBasicsTitle")} />
        <Tab label={t("trainingPlans.create.stepProgramTitle")} />
      </Tabs>

      <Box component="form" sx={{ display: tab === 0 ? "block" : "none" }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanOverviewCard control={control} variant="edit" />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: tab === 1 ? "block" : "none" }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <TrainingPlanWorkoutRichField control={control} />
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            {query?.isLoading ? (
              <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : record?.id ? (
              <WorkoutItemsEditor
                mode="training-plan"
                planId={record.id}
                planVenue={venueLive}
                initialItems={initialLines}
                showSaveButton={false}
                hideHeader
              />
            ) : null}
          </CardContent>
        </Card>
      </Box>

      <StickyActionBar>
        <Button
          variant="text"
          color="inherit"
          onClick={() => navigate("/training-plans")}
          sx={{ color: "text.secondary", textTransform: "none", fontWeight: 500 }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          {...saveButtonProps}
          sx={{ borderRadius: 1.5, fontWeight: 500, textTransform: "none", px: 2.5 }}
        >
          {saveLabel}
        </Button>
      </StickyActionBar>

      <AssignPlanToClientsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        mode="training"
        resourceId={record?.id ?? 0}
        resourceName={record?.name}
      />
    </Box>
  );
}
