/** Align with backend `ai_coach_chat_max_messages` default (trim when calling API). */
export const COACH_ASSISTANT_MAX_API_MESSAGES = 32;

const MAX_STORED_MESSAGES_PER_SESSION = 120;
const MAX_SESSIONS = 40;

const LEGACY_KEY_PREFIX = "gym-coach-assistant:v1:";

export type CoachAssistantTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type CoachChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: CoachAssistantTurn[];
  context?: string;
};

export type CoachAssistantWorkspace = {
  v: 2;
  activeSessionId: string;
  sessions: CoachChatSession[];
};

function newTurnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function newSessionId(): string {
  return newTurnId();
}

export function newCoachAssistantTurn(role: "user" | "assistant", content: string): CoachAssistantTurn {
  return { id: newTurnId(), role, content };
}

export function storageKeyForCoach(coachId: string | number): string {
  return `${LEGACY_KEY_PREFIX}${coachId}`;
}

function parseTurns(raw: unknown): CoachAssistantTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    if (row && typeof row === "object" && "role" in row && "content" in row) {
      const r = row as { id?: string; role: string; content: string };
      return {
        id: typeof r.id === "string" ? r.id : newTurnId(),
        role: r.role === "assistant" ? "assistant" : "user",
        content: String(r.content ?? ""),
      };
    }
    return { id: newTurnId(), role: "user" as const, content: "" };
  });
}

function clipTitle(text: string, max = 52): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "…";
  return `${t.slice(0, max - 1)}…`;
}

/** First line of the user's first message, for the session list title. */
export function coachSessionTitleFromFirstMessage(content: string): string {
  return clipTitle(content, 52);
}

export function createCoachChatSession(defaultTitle: string): CoachChatSession {
  return {
    id: newSessionId(),
    title: defaultTitle,
    updatedAt: Date.now(),
    messages: [],
    context: "",
  };
}

function sortSessionsByRecent(sessions: CoachChatSession[]): CoachChatSession[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

function pruneSessions(sessions: CoachChatSession[], activeId: string): CoachChatSession[] {
  const sorted = sortSessionsByRecent(sessions);
  if (sorted.length <= MAX_SESSIONS) return sorted;
  const active = sorted.find((s) => s.id === activeId);
  const rest = sorted.filter((s) => s.id !== activeId);
  const keptRest = rest.slice(0, MAX_SESSIONS - 1);
  const out = active ? [active, ...keptRest.filter((s) => s.id !== active.id)] : keptRest;
  return sortSessionsByRecent(out);
}

export function loadCoachAssistantWorkspace(
  key: string,
  labels: { newChatTitle: string; migratedSessionTitle: string },
): CoachAssistantWorkspace {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const s = createCoachChatSession(labels.newChatTitle);
      return { v: 2, activeSessionId: s.id, sessions: [s] };
    }
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (j?.v === 2 && typeof j.activeSessionId === "string" && Array.isArray(j.sessions)) {
      const sessions = (j.sessions as unknown[])
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          if (typeof r.id !== "string") return null;
          return {
            id: r.id,
            title: typeof r.title === "string" ? r.title : labels.newChatTitle,
            updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
            messages: parseTurns(r.messages).slice(-MAX_STORED_MESSAGES_PER_SESSION),
            ...(typeof r.context === "string" ? { context: r.context } : {}),
          } as CoachChatSession;
        })
        .filter((s): s is CoachChatSession => Boolean(s));
      if (sessions.length === 0) {
        const s = createCoachChatSession(labels.newChatTitle);
        return { v: 2, activeSessionId: s.id, sessions: [s] };
      }
      let active =
        typeof j.activeSessionId === "string" && sessions.some((s) => s.id === j.activeSessionId)
          ? j.activeSessionId
          : sessions[0].id;
      const pruned = pruneSessions(sessions, active);
      if (!pruned.some((s) => s.id === active)) active = pruned[0].id;
      return { v: 2, activeSessionId: active, sessions: pruned };
    }
    // Migrate v1 single-thread payload (same storage key, inner v was 1)
    if (j?.v === 1 && Array.isArray(j.messages)) {
      const messages = parseTurns(j.messages).slice(-MAX_STORED_MESSAGES_PER_SESSION);
      const context = typeof j.context === "string" ? j.context : "";
      const s = createCoachChatSession(labels.migratedSessionTitle);
      s.messages = messages;
      s.context = context;
      s.updatedAt = Date.now();
      const w: CoachAssistantWorkspace = { v: 2, activeSessionId: s.id, sessions: [s] };
      saveCoachAssistantWorkspace(key, w);
      return w;
    }
  } catch {
    /* ignore */
  }
  const s = createCoachChatSession(labels.newChatTitle);
  return { v: 2, activeSessionId: s.id, sessions: [s] };
}

export function saveCoachAssistantWorkspace(key: string, workspace: CoachAssistantWorkspace): void {
  try {
    const sessions = workspace.sessions.map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_STORED_MESSAGES_PER_SESSION),
    }));
    const pruned = pruneSessions(sessions, workspace.activeSessionId);
    let active = workspace.activeSessionId;
    if (!pruned.some((s) => s.id === active)) active = pruned[0]?.id ?? active;
    const payload: CoachAssistantWorkspace = {
      v: 2,
      activeSessionId: active,
      sessions: sortSessionsByRecent(pruned),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function updateSessionInWorkspace(
  workspace: CoachAssistantWorkspace,
  sessionId: string,
  patch: Partial<Omit<CoachChatSession, "id">>,
): CoachAssistantWorkspace {
  const sessions = workspace.sessions.map((s) =>
    s.id === sessionId ? { ...s, ...patch, id: s.id } : s,
  );
  return { ...workspace, sessions: sortSessionsByRecent(sessions) };
}

export function addSessionToWorkspace(
  workspace: CoachAssistantWorkspace,
  session: CoachChatSession,
): CoachAssistantWorkspace {
  const sessions = pruneSessions([session, ...workspace.sessions], session.id);
  return {
    v: 2,
    activeSessionId: session.id,
    sessions: sortSessionsByRecent(sessions),
  };
}

export function removeSessionFromWorkspace(
  workspace: CoachAssistantWorkspace,
  sessionId: string,
  newChatTitle: string,
): CoachAssistantWorkspace {
  const rest = workspace.sessions.filter((s) => s.id !== sessionId);
  if (rest.length === 0) {
    const s = createCoachChatSession(newChatTitle);
    return { v: 2, activeSessionId: s.id, sessions: [s] };
  }
  let active = workspace.activeSessionId;
  if (active === sessionId) active = rest[0].id;
  if (!rest.some((s) => s.id === active)) active = rest[0].id;
  return { v: 2, activeSessionId: active, sessions: sortSessionsByRecent(rest) };
}
