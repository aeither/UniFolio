import { getQuote } from '@lifi/sdk';

export interface LiFiQuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  formatted?: boolean;
}

export interface LiFiFormattedQuote {
  provider: 'lifi';
  gasFeeETH: string;
  gasFeeUSD: string;
  duration: number;
  destAmount: string;
  destAmountFormatted: string;
  bridgeLoss: string;
  bridgeLossPercentage: string;
}

export interface LiFiRawQuote {
  provider: 'lifi';
  fromAmount: string;
  toAmount: string;
  toAmountFormatted: string;
  executionDuration: number;
  gasCostUSD: string;
  totalFeeUSD: string;
  exchangeRate: string;
  isReal: boolean;
  details: {
    id?: string;
    approvalAddress?: string;
    steps?: Array<{
      type: string;
      description: string;
      gasEstimate?: string;
    }>;
    limits?: {
      min: string;
      max: string;
    };
  };
  rawQuote: any;
}

export async function getLiFiQuote(params: LiFiQuoteParams): Promise<LiFiFormattedQuote | LiFiRawQuote> {
  const { formatted = false } = params;
  
  try {
    const quoteRequest = {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
    };

    const quote = await getQuote(quoteRequest);
    
    const toAmountStr = quote.estimate.toAmount || quote.toAmount || '0';
    const fromAmountStr = quote.estimate.fromAmount || quote.fromAmount || '0';
    const toAmountNum = parseInt(toAmountStr) / 1000000;
    const fromAmountNum = parseInt(fromAmountStr) / 1000000;
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0.000000';
    
    const gasCostUSD = quote.estimate.gasCosts?.[0]?.amountUSD || '0';
    const bridgeLossNum = fromAmountNum - toAmountNum;
    const bridgeLossPercentage = fromAmountNum > 0 ? ((bridgeLossNum / fromAmountNum) * 100).toFixed(2) : '0.00';
    
    if (formatted) {
      return {
        provider: 'lifi',
        gasFeeETH: '0',
        gasFeeUSD: gasCostUSD,
        duration: quote.estimate.executionDuration,
        destAmount: toAmountStr,
        destAmountFormatted: `${isNaN(toAmountNum) ? '0.000000' : toAmountNum.toFixed(6)} USDC`,
        bridgeLoss: bridgeLossNum.toFixed(6),
        bridgeLossPercentage,
      };
    }

    return {
      provider: 'lifi',
      fromAmount: fromAmountStr,
      toAmount: toAmountStr,
      toAmountFormatted: `${isNaN(toAmountNum) ? '0.000000' : toAmountNum.toFixed(6)} USDC`,
      executionDuration: quote.estimate.executionDuration,
      gasCostUSD: gasCostUSD,
      totalFeeUSD: gasCostUSD,
      exchangeRate: exchangeRate,
      isReal: true,
      details: {
        id: quote.id,
        approvalAddress: quote.estimate.approvalAddress,
        steps: quote.includedSteps?.map(step => ({
          type: step.type,
          description: `${step.action.fromToken?.symbol} -> ${step.action.toToken?.symbol}`,
          gasEstimate: step.estimate.gasCosts?.[0]?.estimate?.toString()
        })) || [],
        limits: {
          min: '1000000',
          max: '100000000000'
        }
      },
      rawQuote: quote
    };
  } catch (error) {
    console.error('LiFi quote error:', error);
    throw error;
  }
}