import { useEffect, useRef } from "react";

import { useCoachAi, type PlanBuilderHandlers } from "../contexts/CoachAiContext";

/** Registers training-plan AI draft handlers for the global contextual panel. */
export function useCoachAiPlanBuilder(handlers: PlanBuilderHandlers | null) {
  const { registerPlanBuilder } = useCoachAi();
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    registerPlanBuilder(handlers);
    return () => registerPlanBuilder(null);
  }, [registerPlanBuilder, handlers]);
}
