import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import {
  askCoachAssistant,
  callMcpTool,
  fetchMcpTools,
  type McpToolDefinition,
} from "./api.js";

const server = new McpServer({
  name: "gym-coach",
  version: "0.2.0",
});

function toolText(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

/** Build a permissive zod object from JSON Schema properties (validated server-side). */
function schemaFromTool(def: McpToolDefinition): Record<string, z.ZodTypeAny> {
  const props = def.parameters?.properties;
  if (!props || typeof props !== "object") {
    return {};
  }
  const out: Record<string, z.ZodTypeAny> = {};
  for (const key of Object.keys(props as Record<string, unknown>)) {
    out[key] = z.unknown().optional().describe(`${key} (see tool description)`);
  }
  return out;
}

function registerBackendTool(def: McpToolDefinition): void {
  const inputSchema = schemaFromTool(def);
  const mutating = Boolean(def.mutating);
  const description = mutating
    ? `${def.description} [WRITES DATA — confirm with the coach before calling.]`
    : def.description;

  server.registerTool(
    def.name,
    {
      description,
      inputSchema,
    },
    async (args) => {
      const payload = args as Record<string, unknown>;
      const result = await callMcpTool(def.name, payload);
      return toolText(result);
    }
  );
}

function registerCoachAssistantTool(): void {
  server.registerTool(
    "coach_assistant",
    {
      description:
        "Ask the Gym Coach AI assistant in natural language. It queries your clients, invoices, training plans, exercises, and membership products using the same tools as the in-app assistant. Use for complex questions that need reasoning across multiple data sources. Server-side OpenAI key required.",
      inputSchema: {
        message: z.string().min(1).describe("Question or instruction for the assistant"),
        context: z
          .string()
          .optional()
          .describe("Optional session context (current page, client id, etc.)"),
        locale: z.string().optional().describe("BCP-47 locale, e.g. en or fa"),
      },
    },
    async ({ message, context, locale }) => {
      const reply = await askCoachAssistant({ message, context, locale });
      return toolText({ message: reply });
    }
  );
}

async function main(): Promise<void> {
  const tools = await fetchMcpTools();
  for (const def of tools) {
    registerBackendTool(def);
  }
  registerCoachAssistantTool();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
