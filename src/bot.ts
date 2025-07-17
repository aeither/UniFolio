import { Bot, type Context } from "grammy";
import type { Env } from "./env";
import { getLiFiQuote, type LiFiFormattedQuote } from "./lib/quotes/lifi";
import { getHyperlaneQuote, type HyperlaneFormattedQuote } from "./lib/quotes/hyperlane";
import { getSquidQuote, type SquidFormattedQuote } from "./lib/quotes/squid";
import { getStargateQuote, type StargateFormattedQuote } from "./lib/quotes/stargate";

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
• /lifi - Get LiFi bridge quote
• /hyperlane - Get Hyperlane bridge quote
• /squid - Get Squid bridge quote
• /stargate - Get Stargate bridge quote

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
• /lifi - Get LiFi bridge quote
• /hyperlane - Get Hyperlane bridge quote
• /squid - Get Squid bridge quote
• /stargate - Get Stargate bridge quote

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

  // LiFi quote command
  bot.command("lifi", async (ctx) => {
    await ctx.reply("🔄 Getting LiFi quote...");
    try {
      const quote = await getLiFiQuote({
        fromChain: 8453, // Base
        toChain: 5000, // Mantle
        fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        toToken: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // USDC on Mantle
        fromAmount: '10000000', // 10 USDC
        fromAddress: '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0',
        formatted: true
      }) as LiFiFormattedQuote;
      
      await ctx.reply(`📊 **LiFi Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
    } catch (error) {
      await ctx.reply(`❌ Error getting LiFi quote: ${error}`);
    }
  });

  // Hyperlane quote command
  bot.command("hyperlane", async (ctx) => {
    await ctx.reply("🔄 Getting Hyperlane quote...");
    try {
      console.log('🔍 Getting Hyperlane BASE_RPC_URL...', env.BASE_RPC_URL);
      console.log('🔍 Getting Hyperlane ARBITRUM_RPC_URL...', env.ARBITRUM_RPC_URL);
      const quote = await getHyperlaneQuote({
        fromChain: 'base',
        toChain: 'arbitrum',
        tokenAddress: '0x955132016f9B6376B1392aA7BFF50538d21Ababc', // USDC on Base
        amount: '10',
        rpcUrls: {
          base: env.BASE_RPC_URL || 'https://mainnet.base.org',
          arbitrum: env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
        },
        formatted: true
      }) as HyperlaneFormattedQuote;
      
      await ctx.reply(`📊 **Hyperlane Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
    } catch (error) {
      await ctx.reply(`❌ Error getting Hyperlane quote: ${error}`);
    }
  });

  // Squid quote command
  bot.command("squid", async (ctx) => {
    await ctx.reply("🔄 Getting Squid quote...");
    try {
      const quote = await getSquidQuote({
        fromAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        fromChain: '8453',
        fromToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        fromAmount: '10000000',
        toChain: '5000',
        toToken: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        toAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        integratorId: env.INTEGRATOR_ID || 'test',
        formatted: true
      }) as SquidFormattedQuote;
      
      await ctx.reply(`📊 **Squid Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
    } catch (error) {
      await ctx.reply(`❌ Error getting Squid quote: ${error}`);
    }
  });

  // Stargate quote command
  bot.command("stargate", async (ctx) => {
    await ctx.reply("🔄 Getting Stargate quote...");
    try {
      const quote = await getStargateQuote({
        srcChainKey: 'base',
        dstChainKey: 'mantle',
        srcToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        dstToken: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        srcAmount: '10000000',
        dstAmountMin: '9500000',
        srcAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        dstAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        formatted: true
      }) as StargateFormattedQuote;
      
      await ctx.reply(`📊 **Stargate Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
    } catch (error) {
      await ctx.reply(`❌ Error getting Stargate quote: ${error}`);
    }
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
