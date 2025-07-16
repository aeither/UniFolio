import { Bot, type Context } from "grammy";
import type { Env } from "./env";

export function createBot(env: Env) {
  const bot = new Bot<Context>(env.BOT_TOKEN);

  // Start command with Mini App button
  bot.command("start", async (ctx) => {
    const message = `🤖 **Welcome to the Telegram Mini App Starter!**

This bot provides access to a mini application that you can use directly within Telegram.

**Available Commands:**
• /start - Open the mini app
• /help - Show help information
• /ping - Test if the bot is responsive

Tap the button below to open the mini app! 🚀`;

    // Determine which URL to use based on environment
    const miniAppUrl = env.MINI_APP_URL || "https://basically-enough-clam.ngrok-free.app";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Open Mini App",
              web_app: {
                url: miniAppUrl
              }
            }
          ]
        ]
      }
    });
  });

  // Help command
  bot.command("help", async (ctx) => {
    const message = `📚 **Mini App Bot Help**

**Available Commands:**
• /start - Open the mini app
• /run <url> - Open any URL in mini app
• /help - Show this help
• /ping - Test bot responsiveness

**About Mini Apps:**
Mini apps run directly within Telegram and provide a seamless user experience. They can access Telegram's features and user data with proper permissions.

**Development:**
• Edit \`src/bot.ts\` to customize bot behavior
• Modify the mini app URL in environment variables
• Use \`pnpm run dev:webhook\` for local development
• Use \`pnpm run deploy\` to deploy to Cloudflare Workers

**Environment Variables:**
Make sure to set your \`BOT_TOKEN\` and \`MINI_APP_URL\` in Cloudflare Workers secrets.`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  });

  // Ping command for testing
  bot.command("ping", async (ctx) => {
    await ctx.reply("🏓 Pong! Bot is running.");
  });

  // Run command to open any URL
  bot.command("run", async (ctx) => {
    const url = ctx.match.trim();
    if (!url) {
      await ctx.reply("Please provide a URL to open\nUsage: /run <url>");
      return;
    }

    // Basic URL validation
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validUrl = 'https://' + url;
    }

    try {
      new URL(validUrl);
    } catch {
      await ctx.reply("❌ Invalid URL provided. Please enter a valid URL.");
      return;
    }

    await ctx.reply("🌐 Opening URL...", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔗 Open URL",
              web_app: {
                url: validUrl
              }
            }
          ]
        ]
      }
    });
  });

  // Handle unknown commands
  bot.on("message", async (ctx) => {
    const text = ctx.message?.text;
    if (text && text.startsWith('/')) {
      await ctx.reply("❓ Unknown command. Use /help to see available commands.");
    }
  });

  return bot;
}
