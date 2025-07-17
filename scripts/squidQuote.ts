import { loadDevVars, validateEnv } from './utils/envLoader';

const env = loadDevVars();

// Only need integrator ID for the API call
validateEnv(env, ['INTEGRATOR_ID']);

const integratorId: string = env.INTEGRATOR_ID;

const fromChainId = "8453"; // Base chain ID
const toChainId = "5000"; // Mantle chain ID
const fromToken = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC token address on Base
const toToken = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9"; // USDC token address on Mantle
const userAddress = "0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125"; // Your EVM address

const amount = "10000000"; // 10 USDC (6 decimals)

async function getSquidQuote() {
  try {
    console.log('🔄 Getting Squid quote for bridging 10 USDC from Base to Mantle...');
    
    const params = {
      fromAddress: userAddress,
      fromChain: fromChainId,
      fromToken: fromToken,
      fromAmount: amount,
      toChain: toChainId,
      toToken: toToken,
      toAddress: userAddress
    };

    console.log("Quote Parameters:");
    console.log(`  - From Chain: Base (${fromChainId})`);
    console.log(`  - To Chain: Mantle (${toChainId})`);
    console.log(`  - From Token: ${fromToken} (USDC)`);
    console.log(`  - To Token: ${toToken} (USDC)`);
    console.log(`  - Amount: ${amount} (10 USDC)`);
    console.log(`  - From Address: ${params.fromAddress}`);
    console.log(`  - To Address: ${params.toAddress}`);
    
    // Use the API directly with fetch
    const actualIntegratorId = integratorId !== 'INTEGRATOR_ID' ? integratorId : 'test';
    
    console.log('🔄 Making Squid API call...');
    
    const response = await fetch('https://v2.api.squidrouter.com/v2/route', {
      method: 'POST',
      headers: {
        'x-integrator-id': actualIntegratorId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('✅ Squid API response received');
    
    // Extract the route estimate data
    const route = data.route;
    const estimate = route.estimate;
    
    // Create a clean quote object
    const quote = {
      provider: 'squid',
      requestId: data.quoteId,
      fromAmount: estimate.fromAmount,
      toAmount: estimate.toAmount,
      toAmountMin: estimate.toAmountMin,
      toAmountFormatted: `${(parseInt(estimate.toAmount) / 1000000).toFixed(2)} USDC`,
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

    console.log("✅ Squid Quote Generated:");
    console.log(JSON.stringify(quote, null, 2));
    
    return quote;
  } catch (error) {
    console.error('❌ Error getting Squid quote:', error);
    
    // Return a mock quote on error
    const mockQuote = {
      provider: 'squid',
      requestId: 'mock-request-id-' + Date.now(),
      fromAmount: amount,
      toAmount: '9950000', // Slightly less due to fees
      toAmountMin: '9900000', // With slippage
      toAmountFormatted: '9.95 USDC',
      fromAmountUSD: '10.00',
      toAmountUSD: '9.95',
      exchangeRate: '0.995',
      executionDuration: 300, // 5 minutes
      aggregatePriceImpact: '0.005',
      aggregateSlippage: 0.5,
      feeCosts: [
        {
          name: 'Bridge Fee',
          percentage: '0.1',
          token: { symbol: 'USDC', address: fromToken },
          amount: '10000',
          amountUSD: '0.01'
        }
      ],
      gasCosts: [
        {
          type: 'executeCall',
          token: { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
          amount: '2000000000000000', // 0.002 ETH
          amountUSD: '5.00',
          gasPrice: '10000000000', // 10 gwei
          gasLimit: '200000'
        }
      ],
      routeType: 'bridge',
      isReal: false,
      details: {
        steps: [
          { type: 'swap', description: 'Swap USDC to bridgeable token', fromChain: fromChainId, toChain: fromChainId, provider: 'Mock DEX' },
          { type: 'bridge', description: 'Bridge to Mantle', fromChain: fromChainId, toChain: toChainId, provider: 'Mock Bridge' },
          { type: 'swap', description: 'Swap to final USDC', fromChain: toChainId, toChain: toChainId, provider: 'Mock DEX' }
        ]
      },
      rawQuote: { error: (error as Error).message }
    };

    console.log("✅ Mock Squid Quote Generated (due to API error):");
    console.log(JSON.stringify(mockQuote, null, 2));
    
    return mockQuote;
  }
}

// Run the quote function
getSquidQuote().catch(console.error);

export { getSquidQuote };