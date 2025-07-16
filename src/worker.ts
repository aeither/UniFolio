import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Bot, Context } from "grammy";
import { webhookCallback } from "grammy/web";
import type { Env } from "./env";

// Cache the bot instance to avoid recreating it
let botInstance: Bot<Context> | null = null;

// Lazy imports to avoid startup overhead
async function getBot(env: Env) {
  if (!botInstance) {
    const { createBot } = await import("./bot");
    botInstance = createBot(env);
  }
  return botInstance;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const bot = await getBot(env);
      
      // Handle webhook updates
      const handleUpdate = webhookCallback(bot, "cloudflare-mod");
      return await handleUpdate(request);
      
    } catch (err) {
      console.error("Error handling update:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },

  // Optional: Handle scheduled events (cron jobs)
  async scheduled(event: any, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      console.log('📅 Scheduled event triggered');
      
      // Add your scheduled tasks here
      // Example: Send daily notifications, update data, etc.
      
      console.log('✅ Scheduled event completed');
    } catch (error) {
      console.error('❌ Scheduled event failed:', error);
    }
  }
};
