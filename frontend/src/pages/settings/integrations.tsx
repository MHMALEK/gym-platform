import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPrefix, authHeaders } from "../../lib/api";
import { useAppMessage } from "../../lib/useAppMessage";

type ApiKeyRow = {
  id: number;
  key_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

type ApiKeyCreated = ApiKeyRow & { key: string };

export function IntegrationsSettingsPage() {
  const { t } = useTranslation();
  const message = useAppMessage();
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/me/api-keys`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      setRows((await res.json()) as ApiKeyRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${apiPrefix}/me/api-keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ label: label.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ApiKeyCreated;
      setNewKey(data.key);
      setLabel("");
      await load();
      message.success(t("integrations.keyCreated"));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : t("integrations.keyCreateFailed"));
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: number) => {
    setRevokingId(id);
    try {
      const res = await fetch(`${apiPrefix}/me/api-keys/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      await load();
      message.success(t("integrations.keyRevoked"));
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : t("integrations.keyRevokeFailed"));
    } finally {
      setRevokingId(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t("integrations.copied"));
    } catch {
      message.error(t("integrations.copyFailed"));
    }
  };

  return (
    <Stack spacing={2} maxWidth={720}>
      <Box>
        <Typography variant="h5">{t("integrations.title")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("integrations.subtitle")}
        </Typography>
      </Box>

      <Alert severity="info">{t("integrations.mcpHint")}</Alert>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("integrations.createKey")}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
            <TextField
              size="small"
              label={t("integrations.labelOptional")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={() => void onCreate()} disabled={creating}>
              {creating ? <CircularProgress size={22} /> : t("integrations.generate")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("integrations.activeKeys")}
          </Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("integrations.noKeys")}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {rows.map((row) => (
                <Stack
                  key={row.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {row.label || t("integrations.unlabeledKey")} · {row.key_prefix}…
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("integrations.created")}{" "}
                      {new Date(row.created_at).toLocaleString()}
                      {row.last_used_at
                        ? ` · ${t("integrations.lastUsed")} ${new Date(row.last_used_at).toLocaleString()}`
                        : ""}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={t("integrations.revoke")}
                    size="small"
                    color="error"
                    disabled={revokingId === row.id}
                    onClick={() => void onRevoke(row.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("integrations.cursorSetup")}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t("integrations.cursorSetupBody")}
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1,
              fontSize: 12,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {`{
  "mcpServers": {
    "gym-coach": {
      "command": "npx",
      "args": ["tsx", "${"{path/to/gym-coach-platform/mcp/src/index.ts}"}"],
      "env": {
        "GYM_COACH_API_BASE_URL": "http://127.0.0.1:8000",
        "GYM_COACH_API_KEY": "gck_…"
      }
    }
  }
}`}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={Boolean(newKey)} onClose={() => setNewKey(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("integrations.newKeyTitle")}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("integrations.newKeyWarning")}
          </Alert>
          <TextField fullWidth multiline minRows={2} value={newKey ?? ""} InputProps={{ readOnly: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewKey(null)}>{t("integrations.close")}</Button>
          <Button
            startIcon={<ContentCopyIcon />}
            variant="contained"
            onClick={() => newKey && void copy(newKey)}
          >
            {t("integrations.copyKey")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
