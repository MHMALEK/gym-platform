/** Maps coach routes to contextual AI guides and suggested prompts. */

export type AiAreaId =
  | "desk"
  | "dashboard"
  | "clients"
  | "client-detail"
  | "invoices"
  | "messages"
  | "training-plans"
  | "training-plan-editor"
  | "nutrition"
  | "library"
  | "settings"
  | "default";

export type AiAreaConfig = {
  id: AiAreaId;
  guideKey: string;
  promptKeys: string[];
  planBuildPromptKeys?: string[];
};

const AREAS: Record<AiAreaId, Omit<AiAreaConfig, "id">> = {
  desk: {
    guideKey: "contextualAi.guide.desk",
    promptKeys: [
      "contextualAi.prompts.deskAttention",
      "contextualAi.prompts.deskOverdue",
      "contextualAi.prompts.deskRenewals",
    ],
  },
  dashboard: {
    guideKey: "contextualAi.guide.dashboard",
    promptKeys: [
      "contextualAi.prompts.deskAttention",
      "contextualAi.prompts.activeClients",
      "contextualAi.prompts.deskOverdue",
    ],
  },
  clients: {
    guideKey: "contextualAi.guide.clients",
    promptKeys: [
      "contextualAi.prompts.clientsNeedAttention",
      "contextualAi.prompts.clientsWithoutPlan",
      "contextualAi.prompts.activeClients",
    ],
  },
  "client-detail": {
    guideKey: "contextualAi.guide.clientDetail",
    promptKeys: [
      "contextualAi.prompts.clientSummary",
      "contextualAi.prompts.clientInvoices",
      "contextualAi.prompts.clientNextPlan",
    ],
  },
  invoices: {
    guideKey: "contextualAi.guide.invoices",
    promptKeys: [
      "contextualAi.prompts.deskOverdue",
      "contextualAi.prompts.unpaidInvoices",
      "contextualAi.prompts.renewalInvoices",
    ],
  },
  messages: {
    guideKey: "contextualAi.guide.messages",
    promptKeys: [
      "contextualAi.prompts.unreadMessages",
      "contextualAi.prompts.clientsNeedAttention",
    ],
  },
  "training-plans": {
    guideKey: "contextualAi.guide.trainingPlans",
    promptKeys: [
      "contextualAi.prompts.recentPlans",
      "contextualAi.prompts.exerciseSearch",
      "contextualAi.prompts.planAssignTips",
    ],
    planBuildPromptKeys: [
      "contextualAi.planPrompts.fullBody",
      "contextualAi.planPrompts.hypertrophy",
      "contextualAi.planPrompts.homeGym",
    ],
  },
  "training-plan-editor": {
    guideKey: "contextualAi.guide.trainingPlanEditor",
    promptKeys: [
      "contextualAi.prompts.exerciseSearch",
      "contextualAi.prompts.planStructureTips",
      "contextualAi.prompts.planAssignTips",
    ],
    planBuildPromptKeys: [
      "contextualAi.planPrompts.fullBody",
      "contextualAi.planPrompts.hypertrophy",
      "contextualAi.planPrompts.deload",
    ],
  },
  nutrition: {
    guideKey: "contextualAi.guide.nutrition",
    promptKeys: [
      "contextualAi.prompts.nutritionTemplates",
      "contextualAi.prompts.macroMealPlan",
      "contextualAi.prompts.planAssignTips",
    ],
  },
  library: {
    guideKey: "contextualAi.guide.library",
    promptKeys: [
      "contextualAi.prompts.exerciseSearch",
      "contextualAi.prompts.libraryCopyPlan",
    ],
  },
  settings: {
    guideKey: "contextualAi.guide.settings",
    promptKeys: ["contextualAi.prompts.brandingTips", "contextualAi.prompts.mcpSetup"],
  },
  default: {
    guideKey: "contextualAi.guide.default",
    promptKeys: [
      "contextualAi.prompts.activeClients",
      "contextualAi.prompts.deskOverdue",
      "contextualAi.prompts.exerciseSearch",
    ],
  },
};

export function resolveAiArea(pathname: string): AiAreaConfig {
  if (pathname === "/desk") return { id: "desk", ...AREAS.desk };
  if (pathname === "/dashboard") return { id: "dashboard", ...AREAS.dashboard };
  if (pathname.startsWith("/clients/show/")) return { id: "client-detail", ...AREAS["client-detail"] };
  if (pathname.startsWith("/clients")) return { id: "clients", ...AREAS.clients };
  if (pathname.startsWith("/invoices")) return { id: "invoices", ...AREAS.invoices };
  if (pathname.startsWith("/messages")) return { id: "messages", ...AREAS.messages };
  if (pathname.includes("/training-plans/create") || pathname.includes("/training-plans/edit/")) {
    return { id: "training-plan-editor", ...AREAS["training-plan-editor"] };
  }
  if (pathname.startsWith("/training-plans")) return { id: "training-plans", ...AREAS["training-plans"] };
  if (pathname.startsWith("/nutrition-templates")) return { id: "nutrition", ...AREAS.nutrition };
  if (pathname.startsWith("/library")) return { id: "library", ...AREAS.library };
  if (pathname.startsWith("/settings")) return { id: "settings", ...AREAS.settings };
  return { id: "default", ...AREAS.default };
}

export function areaSupportsPlanBuild(area: AiAreaConfig): boolean {
  return area.id === "training-plans" || area.id === "training-plan-editor";
}
