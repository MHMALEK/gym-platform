import type { RefObject, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { WorkoutLine } from "../lib/workoutLineModel";
import type { WorkoutItemsEditorHandle } from "../components/workout-builder/types";

export type PlanBuilderHandlers = {
  venueType: string;
  workoutEditorRef?: RefObject<WorkoutItemsEditorHandle | null>;
  onApplyWorkoutLines?: (lines: WorkoutLine[]) => void;
  onApplyPlanMeta?: (meta: { planName: string; planDescription: string | null }) => void;
};

type CoachAiContextValue = {
  pageContext: string;
  setPageContext: (ctx: string) => void;
  planBuilder: PlanBuilderHandlers | null;
  registerPlanBuilder: (handlers: PlanBuilderHandlers | null) => void;
  panelOpen: boolean;
  openPanel: (opts?: { tab?: "ask" | "build"; prefill?: string }) => void;
  closePanel: () => void;
  panelTab: "ask" | "build";
  setPanelTab: (tab: "ask" | "build") => void;
  buildPrefill: string;
  setBuildPrefill: (text: string) => void;
};

const CoachAiContext = createContext<CoachAiContextValue | null>(null);

export function CoachAiProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContextState] = useState("");
  const planBuilderRef = useRef<PlanBuilderHandlers | null>(null);
  const [planBuilderVersion, setPlanBuilderVersion] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"ask" | "build">("ask");
  const [buildPrefill, setBuildPrefill] = useState("");

  const setPageContext = useCallback((ctx: string) => {
    setPageContextState(ctx);
  }, []);

  const registerPlanBuilder = useCallback((handlers: PlanBuilderHandlers | null) => {
    planBuilderRef.current = handlers;
    setPlanBuilderVersion((v) => v + 1);
  }, []);

  const openPanel = useCallback((opts?: { tab?: "ask" | "build"; prefill?: string }) => {
    if (opts?.tab) setPanelTab(opts.tab);
    if (opts?.prefill) {
      if (opts.tab === "build") setBuildPrefill(opts.prefill);
      else setBuildPrefill("");
    }
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const planBuilder = useMemo(() => {
    void planBuilderVersion;
    return planBuilderRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version bumps when registration changes
  }, [planBuilderVersion]);

  const value = useMemo(
    () => ({
      pageContext,
      setPageContext,
      planBuilder,
      registerPlanBuilder,
      panelOpen,
      openPanel,
      closePanel,
      panelTab,
      setPanelTab,
      buildPrefill,
      setBuildPrefill,
    }),
    [
      pageContext,
      setPageContext,
      planBuilder,
      registerPlanBuilder,
      panelOpen,
      openPanel,
      closePanel,
      panelTab,
      buildPrefill,
    ],
  );

  return <CoachAiContext.Provider value={value}>{children}</CoachAiContext.Provider>;
}

export function useCoachAi(): CoachAiContextValue {
  const ctx = useContext(CoachAiContext);
  if (!ctx) throw new Error("useCoachAi must be used within CoachAiProvider");
  return ctx;
}
