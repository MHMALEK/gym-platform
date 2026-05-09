import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";

/** Quiet text-style "+ add set" footer below an exercise card. */
export function AddSetBelowFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      style={{
        marginTop: 0,
        marginLeft: 18,
        padding: "4px 0 8px 16px",
        borderLeft: "2px solid var(--app-border-strong)",
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
