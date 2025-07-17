import { getLiFiQuote, type LiFiFormattedQuote } from './quotes/lifi';
import { getHyperlaneQuote, type HyperlaneFormattedQuote } from './quotes/hyperlane';
import { getSquidQuote, type SquidFormattedQuote } from './quotes/squid';
import { getStargateQuote, type StargateFormattedQuote } from './quotes/stargate';
import { type BridgeRequest, SUPPORTED_CHAINS } from './bridgeUtils';
import type { Env } from '../env';

export type AggregatedQuote = LiFiFormattedQuote | HyperlaneFormattedQuote | SquidFormattedQuote | StargateFormattedQuote;

export interface QuoteResult {
  provider: string;
  quote: AggregatedQuote | null;
  error: string | null;
  success: boolean;
}

export interface BestQuoteResult {
  bestQuote: QuoteResult | null;
  allQuotes: QuoteResult[];
  rankings: Array<{
    provider: string;
    score: number;
    rank: number;
  }>;
}

export async function getAllQuotes(bridgeRequest: BridgeRequest, env: Env): Promise<QuoteResult[]> {
  const { amount, token, fromChain, toChain, fromChainId, toChainId, tokenAddress, userAddress } = bridgeRequest;
  
  const formattedAmount = (parseFloat(amount) * Math.pow(10, token === 'usdc' ? 6 : 18)).toString();
  
  const toTokenAddress = SUPPORTED_CHAINS[toChain]?.tokens[token];
  if (!toTokenAddress) {
    throw new Error(`Token ${token} not supported on ${toChain}`);
  }

  const quotePromises = [
    // LiFi Quote
    getLiFiQuote({
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: tokenAddress,
      toToken: toTokenAddress,
      fromAmount: formattedAmount,
      fromAddress: userAddress,
      formatted: true
    }).then(quote => ({ provider: 'lifi', quote: quote as LiFiFormattedQuote, error: null, success: true }))
    .catch(error => ({ provider: 'lifi', quote: null, error: error.message, success: false })),

    // Hyperlane Quote (only for supported chains)
    fromChain === 'base' && toChain === 'arbitrum' ? 
      getHyperlaneQuote({
        fromChain: 'base',
        toChain: 'arbitrum',
        tokenAddress,
        amount,
        rpcUrls: {
          base: env.BASE_RPC_URL || 'https://mainnet.base.org',
          arbitrum: env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
        },
        formatted: true
      }).then(quote => ({ provider: 'hyperlane', quote: quote as HyperlaneFormattedQuote, error: null, success: true }))
      .catch(error => ({ provider: 'hyperlane', quote: null, error: error.message, success: false })) :
      Promise.resolve({ provider: 'hyperlane', quote: null, error: 'Route not supported', success: false }),

    // Squid Quote
    getSquidQuote({
      fromAddress: userAddress,
      fromChain: fromChainId.toString(),
      fromToken: tokenAddress,
      fromAmount: formattedAmount,
      toChain: toChainId.toString(),
      toToken: toTokenAddress,
      toAddress: userAddress,
      integratorId: env.INTEGRATOR_ID || 'test',
      formatted: true
    }).then(quote => ({ provider: 'squid', quote: quote as SquidFormattedQuote, error: null, success: true }))
    .catch(error => ({ provider: 'squid', quote: null, error: error.message, success: false })),

    // Stargate Quote
    getStargateQuote({
      srcChainKey: fromChain,
      dstChainKey: toChain,
      srcToken: tokenAddress,
      dstToken: toTokenAddress,
      srcAmount: formattedAmount,
      dstAmountMin: (parseFloat(formattedAmount) * 0.95).toString(), // 5% slippage
      srcAddress: userAddress,
      dstAddress: userAddress,
      formatted: true
    }).then(quote => ({ provider: 'stargate', quote: quote as StargateFormattedQuote, error: null, success: true }))
    .catch(error => ({ provider: 'stargate', quote: null, error: error.message, success: false }))
  ];

  const results = await Promise.allSettled(quotePromises);
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { provider: 'unknown', quote: null, error: result.reason?.message || 'Unknown error', success: false };
    }
  });
}

export function calculateQuoteScore(quote: AggregatedQuote): number {
  if (!quote) return 0;
  
  // Parse destination amount (remove formatting)
  const destAmountStr = quote.destAmountFormatted.replace(/[^\d.]/g, '');
  const destAmount = parseFloat(destAmountStr) || 0;
  
  // Parse total fees (use totalFeesUSD for Squid, gasFeeUSD for others)
  let totalFees = parseFloat(quote.gasFeeUSD) || 0;
  if ('totalFeesUSD' in quote) {
    totalFees = parseFloat(quote.totalFeesUSD) || 0;
  }
  
  // Parse bridge loss percentage
  const bridgeLossPercentage = parseFloat(quote.bridgeLossPercentage) || 0;
  
  // Calculate score (higher is better)
  // Weight: 60% destination amount, 30% low total fees, 10% low bridge loss
  const amountScore = destAmount * 0.6;
  const feeScore = Math.max(0, (10 - totalFees)) * 0.3; // Penalize high total fees
  const bridgeScore = Math.max(0, (5 - bridgeLossPercentage)) * 0.1; // Penalize high bridge loss
  
  return amountScore + feeScore + bridgeScore;
}

export function getBestQuote(quotes: QuoteResult[]): BestQuoteResult {
  // Filter successful quotes
  const successfulQuotes = quotes.filter(q => q.success && q.quote);
  
  if (successfulQuotes.length === 0) {
    return {
      bestQuote: null,
      allQuotes: quotes,
      rankings: []
    };
  }
  
  // Calculate scores and rank
  const quotesWithScores = successfulQuotes.map(q => ({
    ...q,
    score: calculateQuoteScore(q.quote!)
  }));
  
  // Sort by score (highest first)
  quotesWithScores.sort((a, b) => b.score - a.score);
  
  const rankings = quotesWithScores.map((q, index) => ({
    provider: q.provider,
    score: q.score,
    rank: index + 1
  }));
  
  return {
    bestQuote: quotesWithScores[0] || null,
    allQuotes: quotes,
    rankings
  };
}