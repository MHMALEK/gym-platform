import "dotenv/config";
import { Telegraf } from "telegraf";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
});

const env = envSchema.parse(process.env);

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name ?? "there";
  await ctx.reply(
    `Hi ${firstName}! I am your MVP bot.\n\n` +
      "Available commands:\n" +
      "/start - Welcome message\n" +
      "/help - Command list\n" +
      "/ping - Health check\n" +
      "/echo <text> - Repeat your text"
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "Commands:\n" +
      "/start\n" +
      "/help\n" +
      "/ping\n" +
      "/echo <text>"
  );
});

bot.command("ping", async (ctx) => {
  await ctx.reply("pong");
});

bot.command("echo", async (ctx) => {
  const text = ctx.message.text.replace(/^\/echo(@\w+)?\s*/i, "").trim();
  if (!text) {
    await ctx.reply("Usage: /echo your text");
    return;
  }
  await ctx.reply(text);
});

bot.on("text", async (ctx) => {
  await ctx.reply("I got your message. Try /help for commands.");
});

bot.launch().then(() => {
  console.log("Telegram bot is running (polling mode).");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
