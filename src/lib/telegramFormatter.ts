import { type BestQuoteResult, type QuoteResult } from './quoteAggregator';
import { type BridgeRequest } from './bridgeUtils';

export interface TelegramBridgeResponse {
  text: string;
  reply_markup: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

export function formatBridgeQuotes(
  bridgeRequest: BridgeRequest,
  result: BestQuoteResult
): TelegramBridgeResponse {
  const { amount, token, fromChain, toChain } = bridgeRequest;
  const { bestQuote, allQuotes, rankings } = result;

  // Header
  let text = `🌉 **Bridge Quotes: ${amount} ${token.toUpperCase()}**\n`;
  text += `📤 From: ${fromChain.toUpperCase()}\n`;
  text += `📥 To: ${toChain.toUpperCase()}\n\n`;

  // Show all quotes
  const successfulQuotes = allQuotes.filter(q => q.success && q.quote);
  
  if (successfulQuotes.length === 0) {
    text += "❌ No quotes available. Please try again later.\n\n";
    text += "**Errors:**\n";
    allQuotes.forEach(q => {
      if (!q.success) {
        text += `• ${q.provider}: ${q.error}\n`;
      }
    });
    
    return {
      text,
      reply_markup: {
        inline_keyboard: []
      }
    };
  }

  // Sort quotes by ranking
  const sortedQuotes = successfulQuotes.sort((a, b) => {
    const rankA = rankings.find(r => r.provider === a.provider)?.rank || 999;
    const rankB = rankings.find(r => r.provider === b.provider)?.rank || 999;
    return rankA - rankB;
  });

  // Format each quote
  sortedQuotes.forEach((quoteResult, index) => {
    const quote = quoteResult.quote!;
    const ranking = rankings.find(r => r.provider === quoteResult.provider);
    const isBest = ranking?.rank === 1;
    
    const providerEmoji = getProviderEmoji(quoteResult.provider);
    const rankEmoji = isBest ? "⭐" : `${ranking?.rank || '?'}️⃣`;
    
    text += `${rankEmoji} ${providerEmoji} **${quoteResult.provider.toUpperCase()}**\n`;
    text += `💰 Output: ${quote.destAmountFormatted}\n`;
    text += `⏱️ Time: ${quote.duration}s\n`;
    text += `💸 Gas: $${quote.gasFeeUSD}\n`;
    
    // Add fee costs for Squid
    if (quoteResult.provider === 'squid' && 'feeCostsUSD' in quote) {
      text += `💳 Fees: $${quote.feeCostsUSD}\n`;
      text += `💵 Total: $${quote.totalFeesUSD}\n`;
    }
    
    text += `📉 Loss: ${quote.bridgeLossPercentage}%\n`;
    
    if (index < sortedQuotes.length - 1) {
      text += "\n";
    }
  });

  // Create action buttons
  const buttons: Array<Array<{text: string; callback_data: string}>> = [];
  
  // Add a button for each successful quote
  sortedQuotes.forEach((quoteResult, index) => {
    const ranking = rankings.find(r => r.provider === quoteResult.provider);
    const isBest = ranking?.rank === 1;
    const providerEmoji = getProviderEmoji(quoteResult.provider);
    const starPrefix = isBest ? "⭐ " : "";
    
    const buttonText = `${starPrefix}${providerEmoji} ${quoteResult.provider.toUpperCase()}`;
    // Compact callback data format to stay under 64 bytes
    const callbackData = `bridge:${quoteResult.provider}:${amount}:${token}:${fromChain}:${toChain}`;
    
    buttons.push([{
      text: buttonText,
      callback_data: callbackData
    }]);
  });

  // Add refresh button
  buttons.push([{
    text: "🔄 Refresh Quotes",
    callback_data: `refresh:${amount}:${token}:${fromChain}:${toChain}`
  }]);

  return {
    text,
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

function getProviderEmoji(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'lifi':
      return '🔗';
    case 'hyperlane':
      return '🚀';
    case 'squid':
      return '🦑';
    case 'stargate':
      return '⭐';
    default:
      return '🌉';
  }
}

export function formatBridgeConfirmation(
  provider: string,
  bridgeRequest: BridgeRequest,
  quote: any
): string {
  const { amount, token, fromChain, toChain } = bridgeRequest;
  const providerEmoji = getProviderEmoji(provider);
  
  let text = `${providerEmoji} **${provider.toUpperCase()} Bridge Confirmation**\n\n`;
  text += `📤 From: ${fromChain.toUpperCase()}\n`;
  text += `📥 To: ${toChain.toUpperCase()}\n`;
  text += `💰 Amount: ${amount} ${token.toUpperCase()}\n`;
  text += `📈 You'll receive: ${quote.destAmountFormatted}\n`;
  text += `💸 Gas cost: $${quote.gasFeeUSD}\n`;
  
  // Add fee costs for Squid
  if (provider === 'squid' && 'feeCostsUSD' in quote) {
    text += `💳 Fee costs: $${quote.feeCostsUSD}\n`;
    text += `💵 Total fees: $${quote.totalFeesUSD}\n`;
  }
  
  text += `⏱️ Estimated time: ${quote.duration}s\n\n`;
  text += `🔗 Please complete the transaction in your wallet.\n`;
  text += `⚠️ This is a demo - no actual transaction will be executed.`;
  
  return text;
}