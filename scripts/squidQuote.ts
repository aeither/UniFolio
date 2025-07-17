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
    
    const userAddress = await signer.getAddress();
    
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
    
    // Check if we have a valid integrator ID to make real API call
    if (integratorId !== 'INTEGRATOR_ID') {
      console.log('🔄 Attempting real Squid API call...');
      try {
        const squid = getSDK();
        await squid.init();
        console.log("✅ Initialized Squid SDK");

        const { route, requestId } = await squid.getRoute(params);
        
        const quote = {
          requestId,
          fromAmount: route.estimate.fromAmount,
          toAmount: route.estimate.toAmount,
          toAmountMin: route.estimate.toAmountMin,
          fromAmountUSD: route.estimate.fromAmountUSD,
          toAmountUSD: route.estimate.toAmountUSD,
          exchangeRate: route.estimate.exchangeRate,
          estimatedRouteDuration: route.estimate.estimatedRouteDuration,
          aggregatePriceImpact: route.estimate.aggregatePriceImpact,
          feeCosts: route.estimate.feeCosts,
          gasCosts: route.estimate.gasCosts,
          routeType: 'bridge',
        };

        console.log("✅ Real Squid Quote Generated:");
        console.log(JSON.stringify(quote, null, 2));
        return quote;
      } catch (apiError) {
        console.log('⚠️ API call failed, generating mock quote instead');
        console.log('Error:', (apiError as any)?.response?.data?.message || (apiError as Error).message);
      }
    }
    
    // Generate mock quote when API is not available
    const mockQuote = {
      requestId: 'mock-request-id-' + Date.now(),
      fromAmount: amount,
      toAmount: '9950000', // Slightly less due to fees
      toAmountMin: '9900000', // With slippage
      fromAmountUSD: '10.00',
      toAmountUSD: '9.95',
      exchangeRate: '0.995',
      estimatedRouteDuration: 300, // 5 minutes
      aggregatePriceImpact: '0.005',
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
      route: {
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken: fromToken,
        toToken: toToken,
      },
    };

    console.log("✅ Mock Squid Quote Generated:");
    console.log(JSON.stringify(mockQuote, null, 2));

    // COMMENTED OUT: Actual swap execution
    /*
    console.log("🔄 Would execute swap here...");
    
    if (!route.transactionRequest) {
      console.error("No transaction request in route");
      return mockQuote;
    }

    let target: string;
    if ('target' in route.transactionRequest) {
      target = route.transactionRequest.target;
    } else {
      console.error("Cannot determine target address from transaction request");
      return mockQuote;
    }

    // Would approve spending here
    // await approveSpending(target, fromToken, amount);

    // Would execute the swap transaction here
    // const txResponse = await squid.executeRoute({
    //   signer: signer as any,
    //   route,
    // });
    */

    return mockQuote;
  } catch (error) {
    console.error('❌ Error getting Squid quote:', error);
    throw error;
  }
}

// Run the quote function
getSquidQuote().catch(console.error);

export { getSquidQuote };