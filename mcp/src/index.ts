import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { gymCoachApi } from "./api.js";

const flatPlanItemSchema = z.object({
  exercise_id: z.number().int().positive(),
  sort_order: z.number().int().min(0).optional(),
  sets: z.number().int().min(0).nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  duration_sec: z.number().int().min(0).nullable().optional(),
  rest_sec: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const server = new McpServer({
  name: "gym-coach",
  version: "0.1.0",
});

function toolText(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

server.registerTool(
  "create_flat_training_plan",
  {
    description:
      "Create a training plan with a flat list of exercises (sets/reps per row). No supersets or blocks — only legacy_line rows.",
    inputSchema: {
      name: z.string().min(1).describe("Plan name"),
      description: z.string().nullable().optional().describe("Optional description"),
      items: z
        .array(flatPlanItemSchema)
        .min(1)
        .describe("Ordered exercises: exercise_id, optional sort_order, sets, reps, rest_sec, notes"),
    },
  },
  async ({ name, description, items }) => {
    const normalized = items.map((row, idx) => {
      const sort_order = row.sort_order ?? idx;
      return {
        exercise_id: row.exercise_id,
        sort_order,
        sets: row.sets ?? null,
        reps: row.reps ?? null,
        duration_sec: row.duration_sec ?? null,
        rest_sec: row.rest_sec ?? null,
        notes: row.notes ?? null,
        row_type: "legacy_line" as const,
      };
    });
    const created = (await gymCoachApi("/training-plans", {
      method: "POST",
      json: { name, description: description ?? null, venue_type: "mixed" },
    })) as { id: number };
    const planId = created.id;
    const body = await gymCoachApi(`/training-plans/${planId}/items`, {
      method: "PUT",
      json: normalized,
    });
    return toolText({ training_plan_id: planId, plan: body });
  }
);

server.registerTool(
  "list_clients",
  {
    description: "List clients for the authenticated coach.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      status: z.string().nullable().optional(),
      q: z.string().nullable().optional().describe("Search name or email"),
    },
  },
  async (args) => {
    const sp = new URLSearchParams();
    if (args.limit != null) sp.set("limit", String(args.limit));
    if (args.offset != null) sp.set("offset", String(args.offset));
    if (args.status) sp.set("status", args.status);
    if (args.q) sp.set("q", args.q);
    const q = sp.toString();
    const data = await gymCoachApi(`/clients${q ? `?${q}` : ""}`, { method: "GET" });
    return toolText(data);
  }
);

server.registerTool(
  "create_client",
  {
    description: "Create a client. Only name is required; other fields are optional.",
    inputSchema: {
      name: z.string().min(1),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
    },
  },
  async (body) => {
    const data = await gymCoachApi("/clients", {
      method: "POST",
      json: {
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        status: body.status ?? "active",
      },
    });
    return toolText(data);
  }
);

server.registerTool(
  "list_invoices",
  {
    description: "List invoices with optional filters.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      client_id: z.number().int().positive().optional(),
      status: z
        .enum(["pending", "paid", "overdue", "cancelled"])
        .optional()
        .describe("Invoice status filter"),
    },
  },
  async (args) => {
    const sp = new URLSearchParams();
    if (args.limit != null) sp.set("limit", String(args.limit));
    if (args.offset != null) sp.set("offset", String(args.offset));
    if (args.client_id != null) sp.set("client_id", String(args.client_id));
    if (args.status) sp.set("status", args.status);
    const q = sp.toString();
    const data = await gymCoachApi(`/invoices${q ? `?${q}` : ""}`, { method: "GET" });
    return toolText(data);
  }
);

server.registerTool(
  "search_exercises",
  {
    description: "Search coach exercises by name/description to resolve exercise_id for plans.",
    inputSchema: {
      q: z.string().describe("Search string"),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    },
  },
  async (args) => {
    const sp = new URLSearchParams();
    sp.set("q", args.q);
    if (args.limit != null) sp.set("limit", String(args.limit));
    if (args.offset != null) sp.set("offset", String(args.offset));
    const data = await gymCoachApi(`/exercises?${sp.toString()}`, { method: "GET" });
    return toolText(data);
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
