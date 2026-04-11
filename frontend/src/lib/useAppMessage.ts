import { useSnackbar, type VariantType } from "notistack";

/** Replaces Ant Design `App.useApp().message` with notistack (requires `RefineSnackbarProvider` above). */
export function useAppMessage() {
  const { enqueueSnackbar } = useSnackbar();

  const push = (variant: VariantType) => (msg: string) => {
    enqueueSnackbar(msg, { variant });
  };

  return {
    success: push("success"),
    error: push("error"),
    warning: push("warning"),
    info: push("info"),
  };
}
