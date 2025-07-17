// Standardized bridge quote interface for comparison
export interface BridgeQuote {
  provider: 'hyperlane' | 'lifi' | 'squid' | 'stargate' | 'across';
  fromAmount: string; // Input amount in smallest units
  toAmount: string; // Expected output amount in smallest units
  toAmountFormatted: string; // Human readable amount (e.g. "9.95 USDC")
  executionDuration: number; // Duration in seconds
  gasCostUSD: string; // Gas cost in USD
  totalFeeUSD: string; // Total fee in USD
  exchangeRate: string; // Rate (toAmount/fromAmount)
  isReal: boolean; // Whether this is real data or mock
  
  // Additional details for execution
  details: {
    id?: string; // Quote ID from provider
    approvalAddress?: string; // Contract to approve
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
  
  // Raw quote data needed for execution
  rawQuote?: any; // The full quote object from the provider
  
  // Error information if quote failed
  error?: string;
}

export interface BridgeComparisonParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  walletAddress?: string;
}

export interface BridgeComparison {
  params: BridgeComparisonParams;
  quotes: BridgeQuote[];
  bestQuote: BridgeQuote;
  timestamp: number;
}