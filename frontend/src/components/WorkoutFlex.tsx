import Stack from "@mui/material/Stack";
import type { SxProps, Theme } from "@mui/material/styles";
import type { CSSProperties, ReactNode } from "react";

/** Minimal Ant Design `Flex`-compatible wrapper around MUI `Stack` (pixel `gap`, flex-wrap). */
export type WorkoutFlexProps = {
  vertical?: boolean;
  wrap?: boolean | "wrap" | "nowrap" | "wrap-reverse";
  justify?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly"
    | "stretch";
  align?: "flex-start" | "flex-end" | "center" | "baseline" | "stretch";
  gap?: number;
  style?: CSSProperties;
  children?: ReactNode;
};

export function WorkoutFlex({ vertical, wrap, justify, align, gap, style, children }: WorkoutFlexProps) {
  const wrapVal =
    wrap === true || wrap === "wrap"
      ? "wrap"
      : wrap === "nowrap"
        ? "nowrap"
        : wrap === "wrap-reverse"
          ? "wrap-reverse"
          : undefined;

  const sx: SxProps<Theme> = {
    ...style,
    ...(typeof gap === "number" ? { gap: `${gap}px` } : {}),
  };

  return (
    <Stack
      direction={vertical ? "column" : "row"}
      flexWrap={wrapVal}
      justifyContent={justify}
      alignItems={align}
      sx={sx}
    >
      {children}
    </Stack>
  );
}
