import { Bot, type Context } from "grammy";
import type { Env } from "./env";
import { getLiFiQuote, type LiFiFormattedQuote } from "./lib/quotes/lifi";
import { getHyperlaneQuote, type HyperlaneFormattedQuote } from "./lib/quotes/hyperlane";
import { getSquidQuote, type SquidFormattedQuote } from "./lib/quotes/squid";
import { getStargateQuote, type StargateFormattedQuote } from "./lib/quotes/stargate";
import { parseBridgeCommand, SUPPORTED_CHAINS } from "./lib/bridgeUtils";
import { getAllQuotes, getBestQuote } from "./lib/quoteAggregator";
import { formatBridgeQuotes, formatBridgeConfirmation } from "./lib/telegramFormatter";
import { executeStargateTransactionFromQuote } from "./lib/executes/stargate";
import { getBestUniswapPools, formatPoolsForTelegram, addLiquidityToPool, type AddLiquidityParams } from "./lib/uniswapUtils";

// Helper function to reconstruct bridge request from compact callback data
function reconstructBridgeRequest(amount: string, token: string, fromChain: string, toChain: string) {
  // Use the same parsing logic as parseBridgeCommand to get proper chain IDs and token addresses
  const mockCommand = `bridge ${amount} ${token} from ${fromChain} to ${toChain}`;
  const bridgeRequest = parseBridgeCommand(mockCommand);
  
  if (!bridgeRequest) {
    throw new Error(`Invalid bridge request: ${amount} ${token} from ${fromChain} to ${toChain}`);
  }
  
  return bridgeRequest;
}

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
• bridge [amount] [token] from [chain] to [chain] - Compare all bridge quotes

**Uniswap V4 Commands:**
• show best uniswap pools for farming - View top yielding pools
• add liquidity to ETH/USDC - Add liquidity to ETH/USDC pool

**Examples:** 
• bridge 1 usdc from base to mantle
• show best uniswap pools for farming
• add liquidity to ETH/USDC

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
• bridge [amount] [token] from [chain] to [chain] - Compare all bridge quotes

**Uniswap V4 Commands:**
• show best uniswap pools for farming - View top yielding pools
• add liquidity to ETH/USDC - Add liquidity to ETH/USDC pool

**Examples:** 
• bridge 1 usdc from base to mantle
• show best uniswap pools for farming
• add liquidity to ETH/USDC

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
        fromAmount: '1000000', // 1 USDC
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
        amount: '1',
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
      // Use the same configuration as the working script
      const quote = await getSquidQuote({
        fromAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        fromChain: '8453', // Base
        fromToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
        fromAmount: '1000000', // 1 USDC
        toChain: '5000', // Mantle
        toToken: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // USDC on Mantle
        toAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        integratorId: env.INTEGRATOR_ID || 'test',
        formatted: true
      }) as SquidFormattedQuote;
      
      await ctx.reply(`📊 **Squid Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n💳 **Fee Costs**: $${quote.feeCostsUSD}\n💵 **Total Fees**: $${quote.totalFeesUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
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
        srcAmount: '1000000',
        dstAmountMin: '950000',
        srcAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        dstAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125',
        formatted: true
      }) as StargateFormattedQuote;
      
      await ctx.reply(`📊 **Stargate Quote**\n\n💰 **Output**: ${quote.destAmountFormatted}\n⏱️ **Duration**: ${quote.duration}s\n💸 **Gas Cost**: $${quote.gasFeeUSD}\n📉 **Bridge Loss**: ${quote.bridgeLoss} USDC (${quote.bridgeLossPercentage}%)`);
    } catch (error) {
      await ctx.reply(`❌ Error getting Stargate quote: ${error}`);
    }
  });

  // Message handler for natural language commands
  bot.on("message", async (ctx) => {
    const text = ctx.message?.text;
    if (!text) return;

    const lowerText = text.toLowerCase();

    // Handle bridge command
    if (lowerText.startsWith('bridge ')) {
      const bridgeRequest = parseBridgeCommand(text);
      
      if (!bridgeRequest) {
        await ctx.reply("❌ Invalid bridge command. Use: bridge [amount] [token] from [chain] to [chain]\n\nExample: bridge 1 usdc from base to mantle");
        return;
      }

      await ctx.reply("🔄 Getting quotes from all bridge providers...");
      
      try {
        const quotes = await getAllQuotes(bridgeRequest, env);
        const bestQuoteResult = getBestQuote(quotes);
        const response = formatBridgeQuotes(bridgeRequest, bestQuoteResult);
        
        await ctx.reply(response.text, {
          parse_mode: "Markdown",
          reply_markup: response.reply_markup
        });
      } catch (error) {
        await ctx.reply(`❌ Error getting bridge quotes: ${error}`);
      }
      return;
    }

    // Handle Uniswap pool farming queries
    if (lowerText.includes('show') && lowerText.includes('uniswap') && lowerText.includes('pool') && lowerText.includes('farm')) {
      try {
        const pools = getBestUniswapPools();
        const response = formatPoolsForTelegram(pools);
        
        await ctx.reply(response, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🏊‍♂️ Add Liquidity to ETH/USDC",
                  callback_data: "add_liquidity:ETH/USDC"
                }
              ],
              [
                {
                  text: "🔄 Refresh Pools",
                  callback_data: "refresh_pools"
                }
              ]
            ]
          }
        });
      } catch (error) {
        await ctx.reply(`❌ Error fetching Uniswap pools: ${error}`);
      }
      return;
    }

    // Handle add liquidity command
    if (lowerText.includes('add liquidity to')) {
      const poolMatch = text.match(/add liquidity to (\w+\/\w+)/i);
      if (!poolMatch) {
        await ctx.reply("❌ Please specify a pool. Example: add liquidity to ETH/USDC");
        return;
      }

      const pool = poolMatch[1].toUpperCase();
      if (pool !== 'ETH/USDC') {
        await ctx.reply("❌ Currently only ETH/USDC pool is supported for liquidity addition.");
        return;
      }

      await ctx.reply("🔄 Adding liquidity to ETH/USDC pool...");

      try {
        const privateKey = env.ETHEREUM_PRIVATE_KEY;
        const rpcUrl = env.ETHEREUM_RPC_URL;

        if (!privateKey || !rpcUrl) {
          await ctx.reply("❌ Bot configuration error: Missing private key or RPC URL");
          return;
        }

        // Get user's Telegram ID as a simple address derivation
        // In production, you'd want proper user address management
        const userAddress = '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125'; // Default address

        const params: AddLiquidityParams = {
          pool: 'ETH/USDC',
          ethAmount: '0.0001', // Small default amount
          usdcAmount: '0.3',   // Equivalent USDC
          userAddress,
          rpcUrl,
          privateKey
        };

        const result = await addLiquidityToPool(params);

        if (result.success) {
          await ctx.reply(result.message, { parse_mode: "Markdown" });
        } else {
          await ctx.reply(result.message);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await ctx.reply(`❌ Error adding liquidity: ${errorMessage}`);
      }
      return;
    }

    // Handle unknown commands
    if (text.startsWith('/')) {
      await ctx.reply("❓ Unknown command. Use /help to see available commands.");
    }
  });

  // Handle callback queries (button presses)
  bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData) return;

    try {
      if (callbackData.startsWith('bridge:')) {
        // Parse compact format: bridge:provider:amount:token:fromChain:toChain
        const parts = callbackData.split(':');
        if (parts.length !== 6) {
          await ctx.answerCallbackQuery("Invalid callback data format");
          return;
        }
        
        const [, provider, amount, token, fromChain, toChain] = parts;
        
        // Reconstruct bridge request using helper function
        const bridgeRequest = reconstructBridgeRequest(amount, token, fromChain, toChain);
        
        await ctx.answerCallbackQuery(`Executing bridge via ${provider.toUpperCase()}...`);
        
        // Get the specific quote for this provider
        const quotes = await getAllQuotes(bridgeRequest, env);
        const providerQuote = quotes.find(q => q.provider === provider && q.success);
        
        if (providerQuote?.quote) {
          // Handle Stargate execution
          if (provider === 'stargate') {
            await ctx.editMessageText(`🔄 Executing Stargate bridge transaction...\n\nPlease wait while we process your transaction.`, { parse_mode: "Markdown" });
            
            try {
              const privateKey = env.PRIVATE_KEY;
              if (!privateKey) {
                throw new Error('Private key not found in environment variables');
              }
              
              // Get destination token address based on target chain
              const toChainConfig = Object.values(SUPPORTED_CHAINS).find(c => c.chainId === bridgeRequest.toChainId);
              const dstTokenAddress = toChainConfig?.tokens[bridgeRequest.token] || bridgeRequest.tokenAddress;
              
              // Format amount to Wei (for USDC, use 6 decimals)
              const srcAmountWei = (parseFloat(bridgeRequest.amount) * 1e6).toString();
              const dstAmountMinWei = (parseFloat(bridgeRequest.amount) * 0.95 * 1e6).toString(); // 5% slippage
              
              const stargateParams = {
                srcChainKey: bridgeRequest.fromChain,
                dstChainKey: bridgeRequest.toChain,
                srcToken: bridgeRequest.tokenAddress,
                dstToken: dstTokenAddress,
                srcAmount: srcAmountWei,
                dstAmountMin: dstAmountMinWei,
                srcAddress: bridgeRequest.userAddress,
                dstAddress: bridgeRequest.userAddress
              };
              
              const result = await executeStargateTransactionFromQuote(stargateParams, privateKey);
              
              if (result.success) {
                const txHashes = result.results.map(r => r.hash).join('\n');
                await ctx.editMessageText(`✅ **Stargate Bridge Successful!**\n\n💰 **Amount**: ${bridgeRequest.amount} ${bridgeRequest.token.toUpperCase()}\n🔗 **From**: ${bridgeRequest.fromChain}\n🔗 **To**: ${bridgeRequest.toChain}\n\n📝 **Transaction Hash(es):**\n${txHashes}\n\n🎉 Your tokens have been bridged successfully!`, { parse_mode: "Markdown" });
              } else {
                await ctx.editMessageText(`❌ **Stargate Bridge Failed**\n\n**Error**: ${result.error}\n\nPlease try again or contact support.`, { parse_mode: "Markdown" });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              // Escape special characters for Telegram
              const escapedError = errorMessage.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
              await ctx.editMessageText(`❌ Execution Error\n\nError: ${escapedError}\n\nPlease try again or contact support.`);
            }
          } else {
            // For other providers, show confirmation as before
            const confirmationText = formatBridgeConfirmation(provider, bridgeRequest, providerQuote.quote);
            await ctx.editMessageText(confirmationText, { parse_mode: "Markdown" });
          }
        } else {
          await ctx.editMessageText(`❌ Unable to execute bridge via ${provider.toUpperCase()}. Please try again.`);
        }
      } else if (callbackData.startsWith('refresh:')) {
        // Parse compact format: refresh:amount:token:fromChain:toChain
        const parts = callbackData.split(':');
        if (parts.length !== 5) {
          await ctx.answerCallbackQuery("Invalid refresh callback data format");
          return;
        }
        
        const [, amount, token, fromChain, toChain] = parts;
        
        // Reconstruct bridge request using helper function
        const bridgeRequest = reconstructBridgeRequest(amount, token, fromChain, toChain);
        
        await ctx.answerCallbackQuery("Refreshing quotes...");
        
        const quotes = await getAllQuotes(bridgeRequest, env);
        const bestQuoteResult = getBestQuote(quotes);
        const response = formatBridgeQuotes(bridgeRequest, bestQuoteResult);
        
        await ctx.editMessageText(response.text, {
          parse_mode: "Markdown",
          reply_markup: response.reply_markup
        });
      } else if (callbackData.startsWith('add_liquidity:')) {
        // Handle add liquidity button
        const pool = callbackData.split(':')[1];
        
        await ctx.answerCallbackQuery(`Adding liquidity to ${pool}...`);
        await ctx.editMessageText(`🔄 Adding liquidity to ${pool} pool...\n\nPlease wait while we process your transaction.`);
        
        try {
          const privateKey = env.ETHEREUM_PRIVATE_KEY;
          const rpcUrl = env.ETHEREUM_RPC_URL;

          if (!privateKey || !rpcUrl) {
            await ctx.editMessageText("❌ Bot configuration error: Missing private key or RPC URL");
            return;
          }

          const userAddress = '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125'; // Default address

          const params: AddLiquidityParams = {
            pool: pool,
            ethAmount: '0.0001',
            usdcAmount: '0.3',
            userAddress,
            rpcUrl,
            privateKey
          };

          const result = await addLiquidityToPool(params);

          if (result.success) {
            await ctx.editMessageText(result.message, { parse_mode: "Markdown" });
          } else {
            await ctx.editMessageText(result.message);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await ctx.editMessageText(`❌ Error adding liquidity: ${errorMessage}`);
        }
      } else if (callbackData === 'refresh_pools') {
        // Refresh pool data
        await ctx.answerCallbackQuery("Refreshing pool data...");
        
        try {
          const pools = getBestUniswapPools();
          const response = formatPoolsForTelegram(pools);
          
          await ctx.editMessageText(response, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🏊‍♂️ Add Liquidity to ETH/USDC",
                    callback_data: "add_liquidity:ETH/USDC"
                  }
                ],
                [
                  {
                    text: "🔄 Refresh Pools",
                    callback_data: "refresh_pools"
                  }
                ]
              ]
            }
          });
        } catch (error) {
          await ctx.editMessageText(`❌ Error refreshing pools: ${error}`);
        }
      }
    } catch (error) {
      await ctx.answerCallbackQuery(`Error: ${error}`);
    }
  });

  return bot;
}
