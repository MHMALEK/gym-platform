/** Display helper for API `goal_type` summary (`GET /directory/goal-types` is the source of truth). */

export type GoalTypeSummary = {
  id?: number;
  code?: string;
  label?: string;
};

export function goalTypeLabel(gt: GoalTypeSummary | null | undefined): string {
  if (gt == null) return "—";
  const t = gt.label?.trim();
  return t ? t : "—";
}
