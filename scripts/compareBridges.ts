// Inline type definitions
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

interface BridgeComparisonParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  walletAddress?: string;
}

interface BridgeComparison {
  params: BridgeComparisonParams;
  quotes: BridgeQuote[];
  bestQuote: BridgeQuote;
  timestamp: number;
}

// Import the real quote functions
import { getHyperlaneQuote } from './hyperlaneQuote';
import { getLifiQuote } from './lifiQuote';

async function getSquidQuote(): Promise<BridgeQuote> {
  return {
    provider: 'squid',
    fromAmount: '10000000',
    toAmount: '9950000', // Moderate fee
    toAmountFormatted: '9.950000 USDC',
    executionDuration: 120, // 2 minutes
    gasCostUSD: '5.00',
    totalFeeUSD: '5.05',
    exchangeRate: '0.995000',
    isReal: false,
    details: {
      id: 'squid-mock-' + Date.now(),
      steps: [
        {
          type: 'approve',
          description: 'Token approval',
          gasEstimate: '50000'
        },
        {
          type: 'bridge',
          description: 'Cross-chain bridge via Squid',
          gasEstimate: '150000'
        }
      ],
      limits: {
        min: '1000000',
        max: '1000000000000'
      }
    }
  };
}

async function getStargateQuote(): Promise<BridgeQuote> {
  return {
    provider: 'stargate',
    fromAmount: '10000000',
    toAmount: '9993999', // Very low fee
    toAmountFormatted: '9.993999 USDC',
    executionDuration: 20, // Very fast
    gasCostUSD: '0.10',
    totalFeeUSD: '0.106', // Very competitive
    exchangeRate: '0.999400',
    isReal: false,
    details: {
      id: 'stargate-mock-' + Date.now(),
      approvalAddress: '0x27a16dc786820B16E5c9028b75B99F6f604b5d26',
      steps: [
        {
          type: 'approve',
          description: 'Approve Stargate router',
          gasEstimate: '50000'
        },
        {
          type: 'bridge',
          description: 'Bridge via Stargate v2',
          gasEstimate: '100000'
        }
      ],
      limits: {
        min: '1000000',
        max: '10000000000000'
      }
    }
  };
}

async function getAcrossQuote(): Promise<BridgeQuote> {
  return {
    provider: 'across',
    fromAmount: '10000000',
    toAmount: '9995000', // Low fee
    toAmountFormatted: '9.995000 USDC',
    executionDuration: 60, // 1 minute
    gasCostUSD: '2.00',
    totalFeeUSD: '2.05',
    exchangeRate: '0.999500',
    isReal: false,
    details: {
      id: 'across-mock-' + Date.now(),
      approvalAddress: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5',
      steps: [
        {
          type: 'approve',
          description: 'Approve Across SpokePool',
          gasEstimate: '50000'
        },
        {
          type: 'deposit',
          description: 'Deposit to Across bridge',
          gasEstimate: '120000'
        }
      ],
      limits: {
        min: '1000000',
        max: '100000000000'
      }
    }
  };
}

function findBestQuote(quotes: BridgeQuote[]): BridgeQuote {
  // Sort by highest output amount (best value for user)
  const validQuotes = quotes.filter(q => !q.error);
  if (validQuotes.length === 0) return quotes[0]; // Return first quote if all failed
  
  return validQuotes.reduce((best, current) => {
    const bestOutput = parseInt(best.toAmount);
    const currentOutput = parseInt(current.toAmount);
    return currentOutput > bestOutput ? current : best;
  });
}

async function compareBridges(): Promise<BridgeComparison> {
  console.log('🔄 Comparing bridge quotes for 10 USDC: Base → Mantle\n');

  const params: BridgeComparisonParams = {
    fromChain: 'base',
    toChain: 'mantle',
    fromToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    toToken: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    amount: '10000000',
    walletAddress: '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125'
  };

  // Get quotes from all providers
  console.log('Fetching quotes from all bridges...');
  const [hyperlane, lifi, squid, stargate, across] = await Promise.all([
    getHyperlaneQuote(true).catch(err => ({ 
      provider: 'hyperlane' as const, 
      fromAmount: '10000000', 
      toAmount: '0', 
      toAmountFormatted: '0 USDC',
      executionDuration: 0, 
      gasCostUSD: '0', 
      totalFeeUSD: '0',
      exchangeRate: '0',
      isReal: false,
      details: { steps: [] },
      error: err.message 
    })),
    getLifiQuote(true).catch(err => ({ 
      provider: 'lifi' as const, 
      fromAmount: '10000000', 
      toAmount: '0', 
      toAmountFormatted: '0 USDC',
      executionDuration: 0, 
      gasCostUSD: '0', 
      totalFeeUSD: '0',
      exchangeRate: '0',
      isReal: false,
      details: { steps: [] },
      error: err.message 
    })),
    getSquidQuote().catch(err => ({ 
      provider: 'squid' as const, 
      fromAmount: '10000000', 
      toAmount: '0', 
      toAmountFormatted: '0 USDC',
      executionDuration: 0, 
      gasCostUSD: '0', 
      totalFeeUSD: '0',
      exchangeRate: '0',
      isReal: false,
      details: { steps: [] },
      error: err.message 
    })),
    getStargateQuote().catch(err => ({ 
      provider: 'stargate' as const, 
      fromAmount: '10000000', 
      toAmount: '0', 
      toAmountFormatted: '0 USDC',
      executionDuration: 0, 
      gasCostUSD: '0', 
      totalFeeUSD: '0',
      exchangeRate: '0',
      isReal: false,
      details: { steps: [] },
      error: err.message 
    })),
    getAcrossQuote().catch(err => ({ 
      provider: 'across' as const, 
      fromAmount: '10000000', 
      toAmount: '0', 
      toAmountFormatted: '0 USDC',
      executionDuration: 0, 
      gasCostUSD: '0', 
      totalFeeUSD: '0',
      exchangeRate: '0',
      isReal: false,
      details: { steps: [] },
      error: err.message 
    }))
  ]);

  const quotes = [hyperlane, lifi, squid, stargate, across];
  const bestQuote = findBestQuote(quotes);

  // Display comparison table
  console.log('\n📊 BRIDGE COMPARISON RESULTS');
  console.log('═'.repeat(100));
  console.log(
    'Provider'.padEnd(12) + 
    'Output'.padEnd(15) + 
    'Duration'.padEnd(12) + 
    'Gas Cost'.padEnd(12) + 
    'Total Fee'.padEnd(12) + 
    'Rate'.padEnd(10) + 
    'Status'
  );
  console.log('-'.repeat(100));

  quotes.forEach(quote => {
    const status = quote.error ? '❌ Failed' : 
                  quote.isReal ? '✅ Real' : '🟡 Mock';
    
    console.log(
      quote.provider.toUpperCase().padEnd(12) +
      quote.toAmountFormatted.padEnd(15) +
      `${quote.executionDuration}s`.padEnd(12) +
      `$${quote.gasCostUSD}`.padEnd(12) +
      `$${quote.totalFeeUSD}`.padEnd(12) +
      quote.exchangeRate.padEnd(10) +
      status
    );
  });

  console.log('-'.repeat(100));
  console.log(`🏆 BEST QUOTE: ${bestQuote.provider.toUpperCase()} - ${bestQuote.toAmountFormatted}`);
  console.log(`   Duration: ${bestQuote.executionDuration}s | Total Fee: $${bestQuote.totalFeeUSD}`);

  const comparison: BridgeComparison = {
    params,
    quotes,
    bestQuote,
    timestamp: Date.now()
  };

  return comparison;
}

// Run comparison if this file is executed directly
compareBridges().catch(console.error);

export { compareBridges, BridgeQuote, BridgeComparison };