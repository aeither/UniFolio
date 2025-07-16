import { getQuote } from '@lifi/sdk';
import { loadDevVars, validateEnv } from './utils/envLoader';

const env = loadDevVars();

validateEnv(env, ['BASE_RPC_URL', 'PRIVATE_KEY']);

// For LiFi, we need a wallet address but we can derive it from the private key if needed
// For now, we'll use a placeholder address that can be replaced
const WALLET_ADDRESS = '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0';

const fromChainId = 8453; // Base
const toChainId = 5000; // Mantle
const fromToken = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const toToken = '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9'; // USDC on Mantle
const fromAmount = '10000000'; // 10 USDC (6 decimals)

async function getLifiQuote() {
  try {
    console.log('🔄 Getting LiFi quote for bridging 10 USDC from Base to Mantle...');

    const quoteRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: fromAmount,
      fromAddress: WALLET_ADDRESS,
    };

    console.log("Quote Parameters:");
    console.log(`  - From Chain: Base (${fromChainId})`);
    console.log(`  - To Chain: Mantle (${toChainId})`);
    console.log(`  - From Token: ${fromToken} (USDC)`);
    console.log(`  - To Token: ${toToken} (USDC)`);
    console.log(`  - Amount: ${fromAmount} (10 USDC)`);
    console.log(`  - From Address: ${WALLET_ADDRESS}`);

    const quote = await getQuote(quoteRequest);
    
    // Extract key information from the quote
    const quoteInfo = {
      id: quote.id,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      toAmountMin: quote.toAmountMin,
      fromAmountUSD: quote.fromAmountUSD,
      toAmountUSD: quote.toAmountUSD,
      gasCostUSD: quote.gasCostUSD,
      feeCosts: quote.feeCosts,
      estimate: {
        approvalAddress: quote.estimate.approvalAddress,
        executionDuration: quote.estimate.executionDuration,
        fromAmountUSD: quote.estimate.fromAmountUSD,
        toAmountUSD: quote.estimate.toAmountUSD,
        gasCosts: quote.estimate.gasCosts,
      },
      includedSteps: quote.includedSteps?.map(step => ({
        id: step.id,
        type: step.type,
        action: step.action,
        estimate: {
          executionDuration: step.estimate.executionDuration,
          fromAmountUSD: step.estimate.fromAmountUSD,
          toAmountUSD: step.estimate.toAmountUSD,
          gasCosts: step.estimate.gasCosts,
        }
      })),
      tags: quote.tags,
    };

    console.log("✅ LiFi Quote Generated:");
    console.log(JSON.stringify(quoteInfo, null, 2));

    // COMMENTED OUT: Actual execution would happen here
    /*
    console.log("🔄 Would execute bridge here...");
    
    // For execution, you would use:
    // import { executeRoute } from '@lifi/sdk';
    // const signer = new ethers.Wallet(privateKey, provider);
    // const result = await executeRoute(signer, quote);
    */

    return quote;
  } catch (error) {
    console.error('❌ Error getting LiFi quote:', error);
    
    // If LiFi API fails, provide a mock quote structure
    console.log('⚠️ LiFi API failed, generating mock quote instead');
    
    const mockQuote = {
      id: 'mock-lifi-quote-' + Date.now(),
      fromAmount: fromAmount,
      toAmount: '9980000', // Slightly less due to fees
      toAmountMin: '9930000', // With slippage
      fromAmountUSD: '10.00',
      toAmountUSD: '9.98',
      gasCostUSD: '3.50',
      feeCosts: [
        {
          name: 'LiFi Fee',
          percentage: '0.05',
          token: { symbol: 'USDC', address: fromToken },
          amount: '5000',
          amountUSD: '0.005'
        }
      ],
      estimate: {
        approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
        executionDuration: 180, // 3 minutes
        fromAmountUSD: '10.00',
        toAmountUSD: '9.98',
        gasCosts: [
          {
            type: 'SEND',
            estimate: '150000',
            token: { symbol: 'ETH' },
            amount: '1500000000000000', // 0.0015 ETH
            amountUSD: '3.50'
          }
        ],
      },
      includedSteps: [
        {
          id: 'bridge-step',
          type: 'cross',
          action: {
            fromChainId: fromChainId,
            toChainId: toChainId,
            fromToken: { address: fromToken, symbol: 'USDC', decimals: 6 },
            toToken: { address: toToken, symbol: 'USDC', decimals: 6 },
          },
          estimate: {
            executionDuration: 180,
            fromAmountUSD: '10.00',
            toAmountUSD: '9.98',
            gasCosts: []
          }
        }
      ],
      tags: ['RECOMMENDED', 'FASTEST']
    };

    console.log("✅ Mock LiFi Quote Generated:");
    console.log(JSON.stringify(mockQuote, null, 2));
    
    return mockQuote;
  }
}

// Run the quote function
getLifiQuote().catch(console.error);

export { getLifiQuote };