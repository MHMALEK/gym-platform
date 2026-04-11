import AddIcon from "@mui/icons-material/Add";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { Edit } from "@refinedev/mui";
import { useForm } from "@refinedev/react-hook-form";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AssignPlanToClientsDialog } from "../../components/AssignPlanToClientsDialog";
import { WorkoutItemsEditor, workoutLinesFromApiItems } from "../../components/WorkoutItemsEditor";
import { TrainingPlanOverviewCard, TrainingPlanWorkoutRichField } from "./TrainingPlanSharedFields";

type Item = {
  id: number;
  exercise_id: number;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
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

export function TrainingPlanEdit() {
  const { t } = useTranslation();
  const [assignOpen, setAssignOpen] = useState(false);
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

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<GroupAddIcon />}
              disabled={record?.id == null}
              onClick={() => setAssignOpen(true)}
            >
              {t("assignPlanToClients.assignToClientsButton")}
            </Button>
            <Button component={Link} to="/training-plans/create" variant="outlined" size="medium" startIcon={<AddIcon />}>
              {t("common.quickLinks.newWorkout")}
            </Button>
            <Button component={Link} to="/exercises/create" variant="outlined" size="medium">
              {t("common.quickLinks.newExercise")}
            </Button>
          </Stack>
        </>
      )}
    >
      <Box component="form" sx={{ maxWidth: 960 }}>
        <TrainingPlanOverviewCard control={control} variant="edit" />
        <TrainingPlanWorkoutRichField control={control} />
      </Box>

      {query?.isLoading ? (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : record?.id ? (
        <WorkoutItemsEditor
          mode="training-plan"
          planId={record.id}
          planVenue={venueLive}
          initialItems={initialLines}
          showSaveButton
        />
      ) : null}
      <AssignPlanToClientsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        mode="training"
        resourceId={record?.id ?? 0}
        resourceName={record?.name}
      />
    </Edit>
  );
}
