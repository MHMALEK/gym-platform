import { useSnackbar } from "notistack";
import { useMemo } from "react";

/** Replaces Ant Design `App.useApp().message` with notistack (requires `RefineSnackbarProvider` above). */
export function useAppMessage() {
  const { enqueueSnackbar } = useSnackbar();

  /** Memoized so deps like `useCallback(..., [message])` do not change every render (avoids fetch loops). */
  return useMemo(
    () => ({
      success: (msg: string) => enqueueSnackbar(msg, { variant: "success" }),
      error: (msg: string) => enqueueSnackbar(msg, { variant: "error" }),
      warning: (msg: string) => enqueueSnackbar(msg, { variant: "warning" }),
      info: (msg: string) => enqueueSnackbar(msg, { variant: "info" }),
    }),
    [enqueueSnackbar],
  );
}
