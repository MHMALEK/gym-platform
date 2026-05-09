import "dotenv/config";
import { Markup, Telegraf } from "telegraf";
import { z } from "zod";

type Client = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  goal?: string | null;
};

type InvoiceStatus = "pending" | "paid" | "overdue";

type Invoice = {
  id: number;
  client_id: number;
  amount: number | null;
  due_date: string | null;
  status: InvoiceStatus;
  reference: string | null;
  client?: { id: number; name: string } | null;
};

type ApiList<T> = { items: T[]; total: number; limit: number; offset: number };
type ChatFlow =
  | { type: "addClient"; step: "name" | "email" | "phone" | "goal"; payload: { name?: string; email?: string; phone?: string; goal?: string } }
  | {
      type: "createInvoice";
      step: "clientId" | "amount" | "dueDate" | "note";
      payload: { clientId?: number; amount?: number; dueDate?: string; note?: string };
    };

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  BACKEND_API_BASE_URL: z.string().url("BACKEND_API_BASE_URL must be a valid URL").default("http://localhost:8000"),
  BACKEND_API_KEY: z.string().optional(),
  BACKEND_BEARER_TOKEN: z.string().optional(),
  DEFAULT_CURRENCY: z.string().default("USD"),
});

const env = envSchema.parse(process.env);

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
const apiBase = new URL("/api/v1", env.BACKEND_API_BASE_URL).toString().replace(/\/$/, "");

const MAIN_MENU_BUTTONS = {
  clients: "Clients",
  invoices: "Invoices",
  overdue: "Overdue",
  reminders: "Reminders",
  addClientHelp: "Add Client",
  addInvoiceHelp: "Create Invoice",
  addCheckInHelp: "Add Check-in",
  help: "Help",
  cancel: "Cancel Flow",
} as const;

const mainMenuKeyboard = Markup.keyboard([
  [MAIN_MENU_BUTTONS.clients, MAIN_MENU_BUTTONS.invoices],
  [MAIN_MENU_BUTTONS.overdue, MAIN_MENU_BUTTONS.reminders],
  [MAIN_MENU_BUTTONS.addClientHelp, MAIN_MENU_BUTTONS.addInvoiceHelp],
  [MAIN_MENU_BUTTONS.addCheckInHelp, MAIN_MENU_BUTTONS.help],
  [MAIN_MENU_BUTTONS.cancel],
])
  .resize()
  .persistent();
const flowState = new Map<number, ChatFlow>();

function commandArgs(messageText: string, command: string): string {
  return messageText.replace(new RegExp(`^\\/${command}(@\\w+)?\\s*`, "i"), "").trim();
}

function parsePipeArgs(args: string): string[] {
  return args.split("|").map((item) => item.trim()).filter(Boolean);
}

function formatApiError(error: unknown): string {
  const msg = String(error);
  if (msg.includes("fetch failed")) {
    return "Cannot connect to backend API. Check BACKEND_API_BASE_URL and backend server status.";
  }
  return msg;
}

function toOptionalValue(input: string): string | undefined {
  const value = input.trim();
  if (!value || value === "-" || value.toLowerCase() === "skip") {
    return undefined;
  }
  return value;
}

function getChatId(ctx: { chat?: { id: number } }): number | undefined {
  return ctx.chat?.id;
}

function formatClient(client: Client): string {
  return `${client.id} | ${client.name}${client.email ? ` | ${client.email}` : ""}${client.phone ? ` | ${client.phone}` : ""}${
    client.goal ? ` | goal: ${client.goal}` : ""
  }`;
}

function formatInvoice(invoice: Invoice, clientName: string): string {
  const amount = invoice.amount ?? 0;
  const dueDate = invoice.due_date ?? "-";
  return `${invoice.id} | ${clientName} | ${amount} ${env.DEFAULT_CURRENCY} | due: ${dueDate} | ${invoice.status}`;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (env.BACKEND_API_KEY && env.BACKEND_API_KEY.trim()) {
    headers["X-API-Key"] = env.BACKEND_API_KEY.trim();
  }
  if (env.BACKEND_BEARER_TOKEN && env.BACKEND_BEARER_TOKEN.trim()) {
    headers.Authorization = `Bearer ${env.BACKEND_BEARER_TOKEN.trim()}`;
  }
  return headers;
}

async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  options?: { query?: Record<string, string | number | undefined>; body?: unknown }
): Promise<T> {
  const url = new URL(`${apiBase}${path}`);
  for (const [key, value] of Object.entries(options?.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload && "detail" in payload ? String((payload as { detail: unknown }).detail) : String(payload);
    throw new Error(`API ${method} ${path} failed (${response.status}): ${detail}`);
  }

  return payload as T;
}

async function apiListClients(): Promise<Client[]> {
  const result = await apiRequest<ApiList<Client>>("GET", "/clients", { query: { limit: 100 } });
  return result.items;
}

async function apiGetClient(clientId: number): Promise<{ client: Client }> {
  return apiRequest<{ client: Client }>("GET", `/clients/${clientId}`);
}

async function apiCreateClient(input: {
  name: string;
  email?: string;
  phone?: string;
  goal?: string;
  notes?: string;
}): Promise<Client> {
  return apiRequest<Client>("POST", "/clients", {
    body: {
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      goal: input.goal || null,
      notes: input.notes || null,
    },
  });
}

async function apiListInvoices(status?: InvoiceStatus): Promise<Invoice[]> {
  const result = await apiRequest<ApiList<Invoice>>("GET", "/invoices", {
    query: { limit: 100, status },
  });
  return result.items;
}

async function apiCreateInvoice(input: {
  clientId: number;
  amount: number;
  dueDate?: string;
  note?: string;
}): Promise<Invoice> {
  return apiRequest<Invoice>("POST", "/invoices", {
    body: {
      client_id: input.clientId,
      amount: input.amount,
      due_date: input.dueDate || null,
      notes: input.note || null,
      status: "pending",
      currency: env.DEFAULT_CURRENCY,
    },
  });
}

async function apiMarkPaid(invoiceId: number): Promise<Invoice> {
  return apiRequest<Invoice>("PATCH", `/invoices/${invoiceId}`, { body: { status: "paid" } });
}

const helpText =
  "Gym Coach Bot Commands:\n" +
  "/start - Welcome message\n" +
  "/menu - Show button menu\n" +
  "/help - Command list\n" +
  "/ping - Health check\n" +
  "/add_client <name | email? | phone? | goal?>\n" +
  "/clients - List all clients\n" +
  "/client <clientId> - Client profile card\n" +
  "/invoice <clientId | amount | dueDate(YYYY-MM-DD) | note?>\n" +
  "/invoices [pending|paid|overdue] - List invoices\n" +
  "/mark_paid <invoiceId> - Mark invoice paid\n" +
  "/overdue - Show overdue invoices\n" +
  "/checkin, /checkins - Not available until backend endpoint is added\n" +
  "/reminders - Due soon and overdue";

async function sendClientsList(ctx: { reply: (text: string, extra?: object) => Promise<unknown> }): Promise<void> {
  const clients = await apiListClients();
  if (clients.length === 0) {
    await ctx.reply(
      "No clients yet. Tap Add Client button or use:\n/add_client name | email | phone | goal",
      mainMenuKeyboard
    );
    return;
  }

  const visibleClients = clients.slice(0, 20);
  const lines = visibleClients.map((client, idx) => `${idx + 1}. ${formatClient(client)}`);
  const clientButtons = visibleClients.map((client) => [
    Markup.button.callback(`👤 ${client.name}`, `client:${client.id}`),
    Markup.button.callback("🧾 Invoice", `invoice_help:${client.id}`),
  ]);

  await ctx.reply(
    `Clients (${clients.length})${clients.length > visibleClients.length ? ` - showing first ${visibleClients.length}` : ""}:\n${lines.join("\n")}`,
    {
    ...Markup.inlineKeyboard(clientButtons),
    }
  );
}

async function sendClientCard(ctx: { reply: (text: string, extra?: object) => Promise<unknown> }, clientId: number): Promise<void> {
  const data = await apiGetClient(clientId);
  const client = data.client;
  const invoices = await apiListInvoices();
  const clientInvoices = invoices.filter((invoice) => invoice.client_id === client.id);
  const pendingInvoices = clientInvoices.filter((invoice) => invoice.status !== "paid");

  await ctx.reply(
    `Client card:\n` +
      `${formatClient(client)}\n` +
      `pending invoices: ${pendingInvoices.length}\n` +
      `total invoices: ${clientInvoices.length}`,
    {
      ...Markup.inlineKeyboard([[Markup.button.callback("Create invoice", `invoice_help:${client.id}`)]]),
    }
  );
}

async function sendInvoiceList(
  ctx: { reply: (text: string, extra?: object) => Promise<unknown> },
  filter?: InvoiceStatus
): Promise<void> {
  const invoices = await apiListInvoices(filter);
  if (invoices.length === 0) {
    await ctx.reply(filter ? `No ${filter} invoices.` : "No invoices yet.");
    return;
  }

  const visibleInvoices = invoices.slice(0, 20);
  const lines = visibleInvoices.map((invoice, idx) =>
    `${idx + 1}. ${formatInvoice(invoice, invoice.client?.name ?? `Client ${invoice.client_id}`)}`
  );

  const pendingActions = visibleInvoices
    .filter((invoice) => invoice.status !== "paid")
    .slice(0, 8)
    .map((invoice) => [Markup.button.callback(`Mark paid ${invoice.id}`, `paid:${invoice.id}`)]);

  await ctx.reply(
    `Invoices${filter ? ` (${filter})` : ""} (${invoices.length})${invoices.length > visibleInvoices.length ? ` - showing first ${visibleInvoices.length}` : ""}:\n${lines.join("\n")}`,
    {
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback("All", "invoices:all"),
        Markup.button.callback("Pending", "invoices:pending"),
        Markup.button.callback("Overdue", "invoices:overdue"),
      ],
      ...pendingActions,
    ]),
    }
  );
}

async function startAddClientFlow(ctx: { chat?: { id: number }; reply: (text: string, extra?: object) => Promise<unknown> }): Promise<void> {
  const chatId = getChatId(ctx);
  if (!chatId) return;
  flowState.set(chatId, { type: "addClient", step: "name", payload: {} });
  await ctx.reply("Let’s add a client.\nStep 1/4: send client name.", mainMenuKeyboard);
}

async function startCreateInvoiceFlow(
  ctx: { chat?: { id: number }; reply: (text: string, extra?: object) => Promise<unknown> },
  defaultClientId?: number
): Promise<void> {
  const chatId = getChatId(ctx);
  if (!chatId) return;
  flowState.set(chatId, {
    type: "createInvoice",
    step: defaultClientId ? "amount" : "clientId",
    payload: { clientId: defaultClientId },
  });
  if (defaultClientId) {
    await ctx.reply(`Create invoice for client ${defaultClientId}.\nStep 1/3: send amount.`, mainMenuKeyboard);
    return;
  }
  await ctx.reply("Let’s create an invoice.\nStep 1/4: send client id.", mainMenuKeyboard);
}

async function sendReminderSummary(ctx: { reply: (text: string, extra?: object) => Promise<unknown> }): Promise<void> {
  const allInvoices = await apiListInvoices();
  const clients = await apiListClients();

  const now = new Date();
  const inTwoDays = new Date(now);
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  const nowKey = now.toISOString().slice(0, 10);
  const inTwoDaysKey = inTwoDays.toISOString().slice(0, 10);

  const clientMap = new Map(clients.map((client) => [client.id, client.name]));
  const dueSoon = allInvoices.filter(
    (invoice) =>
      invoice.status === "pending" &&
      invoice.due_date !== null &&
      invoice.due_date >= nowKey &&
      invoice.due_date <= inTwoDaysKey
  );
  const overdue = allInvoices.filter((invoice) => invoice.status === "overdue");

  const lines = [
    `Due soon (${dueSoon.length}): ${dueSoon
      .map((invoice) => `${clientMap.get(invoice.client_id) ?? "Unknown"}:${invoice.due_date ?? "-"}`)
      .join(", ") || "none"}`,
    `Overdue (${overdue.length}): ${overdue
      .map((invoice) => `${clientMap.get(invoice.client_id) ?? "Unknown"}:${invoice.due_date ?? "-"}`)
      .join(", ") || "none"}`,
    "Check-ins: not yet exposed by backend API",
  ];

  await ctx.reply(lines.join("\n"), {
    ...Markup.inlineKeyboard([
      [Markup.button.callback("View overdue", "invoices:overdue"), Markup.button.callback("View all invoices", "invoices:all")],
    ]),
  });
}

bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name ?? "there";
  await ctx.reply(`Hi ${firstName}! I am your Gym Coach assistant bot.\n\n${helpText}`, mainMenuKeyboard);
});

bot.command("menu", async (ctx) => {
  await ctx.reply("Main menu is ready. Tap a button to continue.", mainMenuKeyboard);
});

bot.command("cancel", async (ctx) => {
  const chatId = getChatId(ctx);
  if (!chatId || !flowState.has(chatId)) {
    await ctx.reply("No active flow.", mainMenuKeyboard);
    return;
  }
  flowState.delete(chatId);
  await ctx.reply("Flow cancelled.", mainMenuKeyboard);
});

bot.help(async (ctx) => {
  await ctx.reply(helpText, mainMenuKeyboard);
});

bot.command("ping", async (ctx) => {
  await ctx.reply("pong");
});

bot.command("add_client", async (ctx) => {
  const args = commandArgs(ctx.message.text, "add_client");
  const [name, second, third, fourth] = parsePipeArgs(args);

  if (!name) {
    await ctx.reply("Usage: /add_client name | email(optional) | phone(optional) | goal(optional)");
    return;
  }

  try {
    const legacyAmount = Number(third);
    const usesLegacyFormat = second !== undefined && third !== undefined && !Number.isNaN(legacyAmount);
    const created = await apiCreateClient({
      name,
      email: usesLegacyFormat ? undefined : second,
      phone: usesLegacyFormat ? undefined : third,
      goal: fourth ?? undefined,
      notes: usesLegacyFormat ? `Imported from bot legacy format. Plan: ${second}. Monthly fee: ${third}` : undefined,
    });
    await ctx.reply(`Client added in backend:\n${formatClient(created)}`, mainMenuKeyboard);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("clients", async (ctx) => {
  try {
    await sendClientsList(ctx);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("client", async (ctx) => {
  const clientIdRaw = commandArgs(ctx.message.text, "client");
  if (!clientIdRaw) {
    await ctx.reply("Usage: /client <clientId>");
    return;
  }
  const clientId = Number(clientIdRaw);
  if (Number.isNaN(clientId)) {
    await ctx.reply("clientId must be a number from /clients.");
    return;
  }
  try {
    await sendClientCard(ctx, clientId);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("invoice", async (ctx) => {
  const args = commandArgs(ctx.message.text, "invoice");
  const [clientId, amountRaw, dueDate, note] = parsePipeArgs(args);
  if (!clientId || !amountRaw || !dueDate) {
    await ctx.reply("Usage: /invoice clientId | amount | dueDate(YYYY-MM-DD) | note(optional)");
    return;
  }

  const amount = Number(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    await ctx.reply("amount must be a positive number.");
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    await ctx.reply("dueDate format must be YYYY-MM-DD.");
    return;
  }

  const clientIdNumber = Number(clientId);
  if (Number.isNaN(clientIdNumber)) {
    await ctx.reply("clientId must be numeric.");
    return;
  }

  try {
    const invoice = await apiCreateInvoice({
      clientId: clientIdNumber,
      amount,
      dueDate,
      note,
    });
    await ctx.reply(
      `Invoice created in backend:\n${formatInvoice(invoice, invoice.client?.name ?? `Client ${invoice.client_id}`)}`,
      mainMenuKeyboard
    );
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("invoices", async (ctx) => {
  const filterRaw = commandArgs(ctx.message.text, "invoices").toLowerCase();
  const filter = filterRaw === "pending" || filterRaw === "paid" || filterRaw === "overdue" ? filterRaw : undefined;
  try {
    await sendInvoiceList(ctx, filter);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("mark_paid", async (ctx) => {
  const invoiceIdRaw = commandArgs(ctx.message.text, "mark_paid");
  if (!invoiceIdRaw) {
    await ctx.reply("Usage: /mark_paid <invoiceId>");
    return;
  }
  const invoiceId = Number(invoiceIdRaw);
  if (Number.isNaN(invoiceId)) {
    await ctx.reply("invoiceId must be numeric.");
    return;
  }
  try {
    await apiMarkPaid(invoiceId);
    await ctx.reply(`Invoice ${invoiceId} marked as paid in backend.`, mainMenuKeyboard);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("overdue", async (ctx) => {
  try {
    await sendInvoiceList(ctx, "overdue");
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.command("checkin", async (ctx) => {
  await ctx.reply("Check-ins are not wired yet because backend has no check-in endpoint. I can add it in backend next.");
});

bot.command("checkins", async (ctx) => {
  await ctx.reply("Check-ins are not wired yet because backend has no check-in endpoint. I can add it in backend next.");
});

bot.command("reminders", async (ctx) => {
  try {
    await sendReminderSummary(ctx);
  } catch (error) {
    await ctx.reply(String(error), mainMenuKeyboard);
  }
});

bot.action(/^client:(.+)$/i, async (ctx) => {
  const clientId = Number(ctx.match[1]);
  if (Number.isNaN(clientId)) {
    await ctx.answerCbQuery("Invalid client id");
    return;
  }
  await sendClientCard(ctx, clientId);
  await ctx.answerCbQuery("Client profile");
});

bot.action(/^invoice_help:(.+)$/i, async (ctx) => {
  const clientId = Number(ctx.match[1]);
  if (Number.isNaN(clientId)) {
    await ctx.answerCbQuery("Invalid client id");
    return;
  }
  await startCreateInvoiceFlow(ctx, clientId);
  await ctx.answerCbQuery("Invoice flow started");
});

bot.action(/^paid:(.+)$/i, async (ctx) => {
  const invoiceId = Number(ctx.match[1]);
  if (Number.isNaN(invoiceId)) {
    await ctx.answerCbQuery("Invalid invoice id");
    return;
  }
  try {
    await apiMarkPaid(invoiceId);
    await ctx.answerCbQuery("Marked as paid");
    await sendInvoiceList(ctx);
  } catch (error) {
    await ctx.answerCbQuery("Failed");
    await ctx.reply(formatApiError(error), mainMenuKeyboard);
  }
});

bot.action(/^invoices:(all|pending|overdue)$/i, async (ctx) => {
  const value = ctx.match[1].toLowerCase();
  await sendInvoiceList(ctx, value === "all" ? undefined : (value as InvoiceStatus));
  await ctx.answerCbQuery("Invoices updated");
});

bot.hears(MAIN_MENU_BUTTONS.clients, async (ctx) => {
  try {
    await sendClientsList(ctx);
  } catch (error) {
    await ctx.reply(formatApiError(error), mainMenuKeyboard);
  }
});

bot.hears(MAIN_MENU_BUTTONS.invoices, async (ctx) => {
  try {
    await sendInvoiceList(ctx);
  } catch (error) {
    await ctx.reply(formatApiError(error), mainMenuKeyboard);
  }
});

bot.hears(MAIN_MENU_BUTTONS.overdue, async (ctx) => {
  try {
    await sendInvoiceList(ctx, "overdue");
  } catch (error) {
    await ctx.reply(formatApiError(error), mainMenuKeyboard);
  }
});

bot.hears(MAIN_MENU_BUTTONS.reminders, async (ctx) => {
  try {
    await sendReminderSummary(ctx);
  } catch (error) {
    await ctx.reply(formatApiError(error), mainMenuKeyboard);
  }
});

bot.hears(MAIN_MENU_BUTTONS.addClientHelp, async (ctx) => {
  await startAddClientFlow(ctx);
});

bot.hears(MAIN_MENU_BUTTONS.addInvoiceHelp, async (ctx) => {
  await startCreateInvoiceFlow(ctx);
});

bot.hears(MAIN_MENU_BUTTONS.addCheckInHelp, async (ctx) => {
  await ctx.reply("Check-ins are not available yet in backend API.", mainMenuKeyboard);
});

bot.hears(MAIN_MENU_BUTTONS.help, async (ctx) => {
  await ctx.reply(helpText, mainMenuKeyboard);
});

bot.hears(MAIN_MENU_BUTTONS.cancel, async (ctx) => {
  const chatId = getChatId(ctx);
  if (!chatId || !flowState.has(chatId)) {
    await ctx.reply("No active flow.", mainMenuKeyboard);
    return;
  }
  flowState.delete(chatId);
  await ctx.reply("Flow cancelled.", mainMenuKeyboard);
});

bot.on("text", async (ctx) => {
  const chatId = getChatId(ctx);
  const text = ctx.message.text.trim();

  if (chatId && flowState.has(chatId)) {
    if (text.toLowerCase() === "/cancel" || text.toLowerCase() === "cancel") {
      flowState.delete(chatId);
      await ctx.reply("Flow cancelled.", mainMenuKeyboard);
      return;
    }

    const flow = flowState.get(chatId);
    if (!flow) {
      await ctx.reply("Unknown command. Tap Help button or use /help.", mainMenuKeyboard);
      return;
    }

    if (flow.type === "addClient") {
      if (flow.step === "name") {
        flow.payload.name = text;
        flow.step = "email";
        await ctx.reply("Step 2/4: send email, or type `skip`.", { parse_mode: "Markdown", ...mainMenuKeyboard });
        return;
      }
      if (flow.step === "email") {
        flow.payload.email = toOptionalValue(text);
        flow.step = "phone";
        await ctx.reply("Step 3/4: send phone, or type `skip`.", { parse_mode: "Markdown", ...mainMenuKeyboard });
        return;
      }
      if (flow.step === "phone") {
        flow.payload.phone = toOptionalValue(text);
        flow.step = "goal";
        await ctx.reply("Step 4/4: send goal, or type `skip`.", { parse_mode: "Markdown", ...mainMenuKeyboard });
        return;
      }
      if (flow.step === "goal") {
        flow.payload.goal = toOptionalValue(text);
        try {
          const created = await apiCreateClient({
            name: flow.payload.name ?? "Unknown",
            email: flow.payload.email,
            phone: flow.payload.phone,
            goal: flow.payload.goal,
          });
          flowState.delete(chatId);
          await ctx.reply(`Client added in backend:\n${formatClient(created)}`, mainMenuKeyboard);
        } catch (error) {
          flowState.delete(chatId);
          await ctx.reply(formatApiError(error), mainMenuKeyboard);
        }
        return;
      }
    }

    if (flow.type === "createInvoice") {
      if (flow.step === "clientId") {
        const clientId = Number(text);
        if (Number.isNaN(clientId)) {
          await ctx.reply("Client id must be numeric. Try again.");
          return;
        }
        flow.payload.clientId = clientId;
        flow.step = "amount";
        await ctx.reply("Step 2/4: send amount.");
        return;
      }
      if (flow.step === "amount") {
        const amount = Number(text);
        if (Number.isNaN(amount) || amount <= 0) {
          await ctx.reply("Amount must be a positive number. Try again.");
          return;
        }
        flow.payload.amount = amount;
        flow.step = "dueDate";
        await ctx.reply("Step 3/4: send due date as YYYY-MM-DD.");
        return;
      }
      if (flow.step === "dueDate") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          await ctx.reply("Invalid format. Send due date as YYYY-MM-DD.");
          return;
        }
        flow.payload.dueDate = text;
        flow.step = "note";
        await ctx.reply("Step 4/4: send note, or type `skip`.", { parse_mode: "Markdown", ...mainMenuKeyboard });
        return;
      }
      if (flow.step === "note") {
        flow.payload.note = toOptionalValue(text);
        try {
          const created = await apiCreateInvoice({
            clientId: flow.payload.clientId ?? 0,
            amount: flow.payload.amount ?? 0,
            dueDate: flow.payload.dueDate,
            note: flow.payload.note,
          });
          flowState.delete(chatId);
          await ctx.reply(
            `Invoice created in backend:\n${formatInvoice(created, created.client?.name ?? `Client ${created.client_id}`)}`,
            mainMenuKeyboard
          );
        } catch (error) {
          flowState.delete(chatId);
          await ctx.reply(formatApiError(error), mainMenuKeyboard);
        }
        return;
      }
    }
  }

  await ctx.reply("Unknown command. Tap Help button or use /help.", mainMenuKeyboard);
});

bot.launch().then(() => {
  console.log("Telegram bot is running (polling mode).");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
