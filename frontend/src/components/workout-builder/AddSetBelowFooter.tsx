import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";

/** Quiet text-style "+ add set" footer below an exercise card. */
export function AddSetBelowFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      style={{
        marginTop: 0,
        padding: "4px 8px 8px",
        borderTop: "1px solid var(--app-border)",
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <Button
        variant="text"
        size="small"
        startIcon={<AddIcon fontSize="small" />}
        onClick={onClick}
        sx={{
          color: "text.secondary",
          fontWeight: 500,
          textTransform: "none",
          minHeight: 30,
          px: 1.25,
          "&:hover": { color: "primary.main", bgcolor: "action.hover" },
        }}
      >
        {label}
      </Button>
    </div>
  );
}
