import Box from "@mui/material/Box";

/**
 * Coach platform brand mark — diagonal barbell on a rounded tile.
 * Tile uses `currentColor` so a parent can control the accent via `color`
 * (e.g. `color: "primary.main"`), and the barbell itself is the contrast color.
 */
export function BrandMark({
  size = 32,
  contrast = "#fff",
  radius = 8,
}: {
  size?: number;
  contrast?: string;
  radius?: number;
}) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        {/* Tile */}
        <rect width="32" height="32" rx={radius} ry={radius} fill="currentColor" />
        {/* Diagonal barbell — drawn from bottom-left to top-right for an upward "lift" feel */}
        <g
          stroke={contrast}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={contrast}
        >
          {/* Bar */}
          <line x1="10.4" y1="21.6" x2="21.6" y2="10.4" strokeWidth="2.6" />
          {/* End plates */}
          <rect
            x="6.8"
            y="18"
            width="7.2"
            height="7.2"
            rx="1.6"
            ry="1.6"
            transform="rotate(-45 10.4 21.6)"
          />
          <rect
            x="18"
            y="6.8"
            width="7.2"
            height="7.2"
            rx="1.6"
            ry="1.6"
            transform="rotate(-45 21.6 10.4)"
          />
        </g>
      </svg>
    </Box>
  );
}
