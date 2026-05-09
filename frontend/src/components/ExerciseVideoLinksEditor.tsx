import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { createExerciseVideoLink, deleteExerciseVideoLink } from "../lib/exerciseVideoLinksApi";
import { useAppMessage } from "../lib/useAppMessage";
import type { ExerciseVideoLink } from "../types/exercise";
import { ExerciseMediaPreview } from "./ExerciseMediaPreview";

export function ExerciseVideoLinksEditor({
  exerciseId,
  initialLinks = [],
}: {
  exerciseId: string;
  initialLinks?: ExerciseVideoLink[];
}) {
  const message = useAppMessage();
  const [links, setLinks] = useState([...initialLinks].sort((a, b) => a.sort_order - b.sort_order));
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLinks([...initialLinks].sort((a, b) => a.sort_order - b.sort_order));
  }, [initialLinks]);

  const addLink = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const created = await createExerciseVideoLink(exerciseId, {
        url: url.trim(),
        title: title.trim() || "YouTube tutorial",
        sort_order: links.length,
      });
      setLinks((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setUrl("");
      setTitle("");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: number) => {
    try {
      await deleteExerciseVideoLink(exerciseId, id);
      setLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              YouTube tutorials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add coach-approved tutorial videos. These stay as external embeds.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
            <TextField size="small" label="YouTube URL" value={url} onChange={(e) => setUrl(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="contained" startIcon={<AddIcon />} disabled={saving || !url.trim()} onClick={addLink}>
              Add
            </Button>
          </Stack>
          {links.length ? (
            <Stack spacing={1.25}>
              {links.map((link) => (
                <Card key={link.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" gap={1.5} alignItems="center">
                      <Box sx={{ width: 150, flexShrink: 0 }}>
                        <ExerciseMediaPreview url={link.url} title={link.title ?? "YouTube tutorial"} compact />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {link.title || "YouTube tutorial"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {link.url}
                        </Typography>
                      </Box>
                      <IconButton color="error" onClick={() => void removeLink(link.id)} aria-label="Remove YouTube tutorial">
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No YouTube tutorials yet.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
