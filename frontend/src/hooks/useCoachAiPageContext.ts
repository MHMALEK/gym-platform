import { useEffect } from "react";

import { useCoachAi } from "../contexts/CoachAiContext";

/** Sets optional page context for the contextual AI panel (cleared on unmount). */
export function useCoachAiPageContext(context: string | null | undefined) {
  const { setPageContext } = useCoachAi();

  useEffect(() => {
    setPageContext(context?.trim() ?? "");
    return () => setPageContext("");
  }, [context, setPageContext]);
}
