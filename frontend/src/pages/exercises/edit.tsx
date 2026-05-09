import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Edit } from "@refinedev/mui";
import { useOne } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { ExerciseFormMediaUpload } from "../../components/ExerciseFormMediaUpload";
import { ExerciseMediaGallery } from "../../components/ExerciseMediaGallery";
import { ExerciseVideoLinksEditor } from "../../components/ExerciseVideoLinksEditor";
import { MuscleGroupSelect } from "../../components/MuscleGroupSelect";
import type { ExerciseRecord } from "../../types/exercise";

const THUMB_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const DEMO_ACCEPT = "video/mp4,video/webm,image/jpeg,image/png,image/webp,image/gif";

type ExerciseFormValues = Record<string, unknown>;

export function ExerciseEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const { data: exerciseData } = useOne<ExerciseRecord>({
    resource: "exercises",
    id: id ?? "",
    queryOptions: { enabled: !!id },
  });
  const { control, saveButtonProps } = useForm<ExerciseFormValues>({
    refineCoreProps: { resource: "exercises", id },
    defaultValues: {
      muscle_group_ids: [] as number[],
    },
  });

  const venueOptions = [
    { value: "both", label: t("workouts.venue.both") },
    { value: "home", label: t("workouts.venue.home") },
    { value: "commercial_gym", label: t("workouts.venue.commercial_gym") },
  ];

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Button component={Link} to="/exercises/create" variant="outlined" startIcon={<AddIcon />} size="medium">
            {t("common.quickLinks.newExercise")}
          </Button>
        </>
      )}
    >
      <Box component="form" sx={{ maxWidth: 720 }}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label={t("exercises.form.name")}
              fullWidth
              margin="normal"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("exercises.form.description")} fullWidth margin="normal" multiline minRows={2} />
          )}
        />
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("exercises.form.category")} fullWidth margin="normal" />
          )}
        />
        <Controller
          name="difficulty"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Difficulty" fullWidth margin="normal" />
          )}
        />
        <Controller
          name="exercise_type"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Exercise type" fullWidth margin="normal" />
          )}
        />
        <Controller
          name="muscle_group_ids"
          control={control}
          render={({ field }) => (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("exercises.form.muscleGroups")}
              </Typography>
              <MuscleGroupSelect value={(field.value as number[] | undefined) ?? []} onChange={field.onChange} />
            </Box>
          )}
        />
        <Controller
          name="equipment"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("exercises.form.equipment")} fullWidth margin="normal" />
          )}
        />
        <Controller
          name="venue_type"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? "both"} label={t("exercises.form.venue")} fullWidth margin="normal" select>
              {venueOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="tips"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label={t("exercises.form.tips")} fullWidth margin="normal" multiline minRows={3} />
          )}
        />
        <LinesController name="instructions" control={control} label="Instructions" />
        <Controller
          name="common_mistakes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label={t("exercises.form.commonMistakes")}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
            />
          )}
        />
        <Controller
          name="setup_notes"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Setup notes" fullWidth margin="normal" multiline minRows={2} />
          )}
        />
        <Controller
          name="safety_notes"
          control={control}
          render={({ field }) => (
            <TextField {...field} value={field.value ?? ""} label="Safety notes" fullWidth margin="normal" multiline minRows={2} />
          )}
        />
        <LinesController name="body_parts" control={control} label="Body parts" />
        <LinesController name="secondary_muscles" control={control} label="Secondary muscles" />
        <Controller
          name="correct_form_cues"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label={t("exercises.form.correctFormCues")}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
            />
          )}
        />
        <Controller
          name="thumbnail_url"
          control={control}
          render={({ field }) => (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("exercises.form.thumbnailUrl")}
              </Typography>
              <ExerciseFormMediaUpload
                variant="thumbnail"
                accept={THUMB_ACCEPT}
                exerciseId={id}
                linkRole="thumbnail"
                onUploaded={() => setGalleryRefresh((n) => n + 1)}
                value={field.value as string | null}
                onChange={field.onChange}
              />
            </Box>
          )}
        />
        <Controller
          name="demo_media_url"
          control={control}
          render={({ field }) => (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("exercises.form.demoMediaUrl")}
              </Typography>
              <ExerciseFormMediaUpload
                variant="demo"
                accept={DEMO_ACCEPT}
                exerciseId={id}
                linkRole="primary_video"
                onUploaded={() => setGalleryRefresh((n) => n + 1)}
                value={field.value as string | null}
                onChange={field.onChange}
              />
            </Box>
          )}
        />
      </Box>
      {id ? <ExerciseMediaGallery exerciseId={id} refreshSignal={galleryRefresh} /> : null}
      {id ? <ExerciseVideoLinksEditor exerciseId={id} initialLinks={exerciseData?.data.video_links ?? []} /> : null}
    </Edit>
  );
}

function LinesController({
  name,
  control,
  label,
}: {
  name: string;
  control: Control<ExerciseFormValues>;
  label: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          value={Array.isArray(field.value) ? field.value.join("\n") : field.value ?? ""}
          label={label}
          fullWidth
          margin="normal"
          multiline
          minRows={2}
          onChange={(e) => field.onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))}
          onBlur={field.onBlur}
          inputRef={field.ref}
        />
      )}
    />
  );
}
