import { getQuote } from '@lifi/sdk';
import { loadDevVars, validateEnv } from './utils/envLoader';

// Inline type definition
interface BridgeQuote {
  provider: 'hyperlane' | 'lifi' | 'squid' | 'stargate' | 'across';
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
  rawQuote?: any;
  error?: string;
}

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

async function getLifiQuote(silent: boolean = false): Promise<BridgeQuote> {
  try {
    if (!silent) {
      console.log('🔄 Getting LiFi quote for bridging 10 USDC from Base to Mantle...');
    }

    const quoteRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: fromAmount,
      fromAddress: WALLET_ADDRESS,
    };

    if (!silent) {
      console.log("Quote Parameters:");
      console.log(`  - From Chain: Base (${fromChainId})`);
      console.log(`  - To Chain: Mantle (${toChainId})`);
      console.log(`  - From Token: ${fromToken} (USDC)`);
      console.log(`  - To Token: ${toToken} (USDC)`);
      console.log(`  - Amount: ${fromAmount} (10 USDC)`);
      console.log(`  - From Address: ${WALLET_ADDRESS}`);
    }

    const quote = await getQuote(quoteRequest);
    
    // Calculate values - LiFi returns amounts in estimate object
    const toAmountStr = quote.estimate.toAmount || quote.toAmount || '0';
    const fromAmountStr = quote.estimate.fromAmount || quote.fromAmount || '0';
    const toAmountNum = parseInt(toAmountStr) / 1000000; // Convert to USDC
    const fromAmountNum = parseInt(fromAmountStr) / 1000000;
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0.000000';
    
    // Extract gas cost
    const gasCostUSD = quote.estimate.gasCosts?.[0]?.amountUSD || '0';
    
    // Create standardized quote
    const standardQuote: BridgeQuote = {
      provider: 'lifi',
      fromAmount: fromAmountStr,
      toAmount: toAmountStr,
      toAmountFormatted: `${isNaN(toAmountNum) ? '0.000000' : toAmountNum.toFixed(6)} USDC`,
      executionDuration: quote.estimate.executionDuration,
      gasCostUSD: gasCostUSD,
      totalFeeUSD: gasCostUSD, // LiFi typically only has gas costs
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
          min: '1000000', // 1 USDC
          max: '100000000000' // 100k USDC
        }
      },
      rawQuote: quote
    };

    if (!silent) {
      console.log("✅ LiFi Quote Generated:");
      console.log(`  - Output: ${standardQuote.toAmountFormatted}`);
      console.log(`  - Duration: ${standardQuote.executionDuration}s`);
      console.log(`  - Gas Cost: $${standardQuote.gasCostUSD}`);
      console.log(`  - Exchange Rate: ${standardQuote.exchangeRate}`);
      
      console.log("\n📊 Raw LiFi Quote for debugging:");
      console.log(JSON.stringify({
        id: quote.id,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        toAmountMin: quote.toAmountMin,
        fromAmountUSD: quote.fromAmountUSD,
        toAmountUSD: quote.toAmountUSD,
        gasCostUSD: quote.gasCostUSD,
        estimate: quote.estimate,
        includedSteps: quote.includedSteps?.slice(0, 1) // Just first step to avoid too much output
      }, null, 2));
    }

    // COMMENTED OUT: Actual execution would happen here
    /*
    console.log("🔄 Would execute bridge here...");
    
    // For execution, you would use:
    // import { executeRoute } from '@lifi/sdk';
    // const signer = new ethers.Wallet(privateKey, provider);
    // const result = await executeRoute(signer, quote);
    */

    return standardQuote;
  } catch (error) {
    if (!silent) {
      console.error('❌ Error getting LiFi quote:', error);
      console.log('⚠️ LiFi API failed, generating mock quote instead');
    }
    
    // Return standardized mock quote
    const mockQuote: BridgeQuote = {
      provider: 'lifi',
      fromAmount: fromAmount,
      toAmount: '9980000', // 9.98 USDC
      toAmountFormatted: '9.980000 USDC',
      executionDuration: 180, // 3 minutes
      gasCostUSD: '3.50',
      totalFeeUSD: '3.50',
      exchangeRate: '0.998000',
      isReal: false,
      details: {
        id: 'mock-lifi-quote-' + Date.now(),
        approvalAddress: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
        steps: [
          {
            type: 'cross',
            description: 'USDC -> USDC',
            gasEstimate: '150000'
          }
        ],
        limits: {
          min: '1000000',
          max: '100000000000'
        }
      },
      error: (error as Error).message
    };

    if (!silent) {
      console.log("✅ Mock LiFi Quote Generated:");
      console.log(`  - Output: ${mockQuote.toAmountFormatted}`);
      console.log(`  - Duration: ${mockQuote.executionDuration}s`);
      console.log(`  - Gas Cost: $${mockQuote.gasCostUSD}`);
    }
    
    return mockQuote;
  }
}

// Run the quote function
getLifiQuote().catch(console.error);

export { getLifiQuote };