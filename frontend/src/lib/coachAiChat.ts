import { apiPrefix, authHeaders } from "./api";
import { COACH_ASSISTANT_MAX_API_MESSAGES } from "./coachAssistantSession";

export type CoachChatTurn = { role: "user" | "assistant"; content: string };

export async function sendCoachChat(params: {
  messages: CoachChatTurn[];
  context?: string | null;
  locale: string;
}): Promise<{ message: string } | { error: string }> {
  const trimmed = params.messages.slice(-COACH_ASSISTANT_MAX_API_MESSAGES);
  const ctx = params.context?.trim();
  try {
    const res = await fetch(`${apiPrefix}/ai/coach-chat`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
        ...(ctx ? { context: ctx } : {}),
        locale: params.locale,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = raw;
      try {
        const j = JSON.parse(raw) as { detail?: unknown };
        if (typeof j.detail === "string") detail = j.detail;
      } catch {
        /* keep raw */
      }
      return { error: detail || "error" };
    }
    const data = JSON.parse(raw) as { message?: string };
    return { message: (data.message ?? "").trim() };
  } catch {
    return { error: "network" };
  }
}
