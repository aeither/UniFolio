export interface SquidQuoteParams {
  fromAddress: string;
  fromChain: string;
  fromToken: string;
  fromAmount: string;
  toChain: string;
  toToken: string;
  toAddress: string;
  integratorId: string;
  formatted?: boolean;
}

export interface SquidFormattedQuote {
  provider: 'squid';
  gasFeeETH: string;
  gasFeeUSD: string;
  feeCostsUSD: string;
  totalFeesUSD: string;
  duration: number;
  destAmount: string;
  destAmountFormatted: string;
  bridgeLoss: string;
  bridgeLossPercentage: string;
}

export interface SquidRawQuote {
  provider: 'squid';
  requestId: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  toAmountFormatted: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  exchangeRate: string;
  executionDuration: number;
  aggregatePriceImpact: string;
  aggregateSlippage: number;
  feeCosts: any[];
  gasCosts: any[];
  routeType: string;
  isReal: boolean;
  details: {
    steps: Array<{
      type: string;
      description: string;
      fromChain: string;
      toChain: string;
      provider: string;
      estimatedDuration?: number;
    }>;
  };
  rawQuote: any;
}

export async function getSquidQuote(params: SquidQuoteParams): Promise<SquidFormattedQuote | SquidRawQuote> {
  const { formatted = false } = params;
  
  try {
    const actualIntegratorId = params.integratorId !== 'INTEGRATOR_ID' ? params.integratorId : 'test';
    
    // Use the same parameters structure as the working script
    const requestParams = {
      fromAddress: params.fromAddress,
      fromChain: params.fromChain,
      fromToken: params.fromToken,
      fromAmount: params.fromAmount,
      toChain: params.toChain,
      toToken: params.toToken,
      toAddress: params.toAddress
    };
    
    console.log('🔄 Making Squid API call with params:', JSON.stringify(requestParams, null, 2));
    console.log('🔍 Using integrator ID:', actualIntegratorId);
    
    const response = await fetch('https://v2.api.squidrouter.com/v2/route', {
      method: 'POST',
      headers: {
        'x-integrator-id': actualIntegratorId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const route = data.route;
    const estimate = route.estimate;
    
    const toAmountNum = parseInt(estimate.toAmount) / 1000000;
    const fromAmountNum = parseInt(estimate.fromAmount) / 1000000;
    const bridgeLossNum = fromAmountNum - toAmountNum;
    const bridgeLossPercentage = fromAmountNum > 0 ? ((bridgeLossNum / fromAmountNum) * 100).toFixed(2) : '0.00';
    
    const gasCostUSD = estimate.gasCosts?.[0]?.amountUSD || '0';
    
    // Calculate total fee costs in USD
    const feeCostsUSD = estimate.feeCosts?.reduce((total: number, fee: any) => {
      return total + (parseFloat(fee.amountUsd || '0'));
    }, 0).toFixed(2) || '0';
    
    // Calculate total fees (gas + fee costs)
    const totalFeesUSD = (parseFloat(gasCostUSD) + parseFloat(feeCostsUSD)).toFixed(2);
    
    if (formatted) {
      return {
        provider: 'squid',
        gasFeeETH: '0',
        gasFeeUSD: gasCostUSD,
        feeCostsUSD,
        totalFeesUSD,
        duration: estimate.estimatedRouteDuration,
        destAmount: estimate.toAmount,
        destAmountFormatted: `${toAmountNum.toFixed(2)} USDC`,
        bridgeLoss: bridgeLossNum.toFixed(6),
        bridgeLossPercentage,
      };
    }

    return {
      provider: 'squid',
      requestId: data.quoteId,
      fromAmount: estimate.fromAmount,
      toAmount: estimate.toAmount,
      toAmountMin: estimate.toAmountMin,
      toAmountFormatted: `${toAmountNum.toFixed(2)} USDC`,
      fromAmountUSD: estimate.fromAmountUSD,
      toAmountUSD: estimate.toAmountUSD,
      exchangeRate: estimate.exchangeRate,
      executionDuration: estimate.estimatedRouteDuration,
      aggregatePriceImpact: estimate.aggregatePriceImpact,
      aggregateSlippage: estimate.aggregateSlippage,
      feeCosts: estimate.feeCosts,
      gasCosts: estimate.gasCosts,
      routeType: 'bridge',
      isReal: true,
      details: {
        steps: estimate.actions.map((action: any) => ({
          type: action.type,
          description: action.description,
          fromChain: action.fromChain,
          toChain: action.toChain,
          provider: action.provider,
          estimatedDuration: action.estimatedDuration
        }))
      },
      rawQuote: data
    };
  } catch (error) {
    console.error('Squid quote error:', error);
    throw error;
  }
}