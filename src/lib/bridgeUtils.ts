export interface BridgeRequest {
  amount: string;
  token: string;
  fromChain: string;
  toChain: string;
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  userAddress: string;
}

export interface ChainConfig {
  name: string;
  chainId: number;
  tokens: {
    [tokenSymbol: string]: string;
  };
  rpcUrl?: string;
}

export const SUPPORTED_CHAINS: { [key: string]: ChainConfig } = {
  base: {
    name: 'base',
    chainId: 8453,
    tokens: {
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      eth: '0x4200000000000000000000000000000000000006'
    }
  },
  mantle: {
    name: 'mantle',
    chainId: 5000,
    tokens: {
      usdc: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
      eth: '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111'
    }
  },
  arbitrum: {
    name: 'arbitrum',
    chainId: 42161,
    tokens: {
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      eth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  },
  ethereum: {
    name: 'ethereum',
    chainId: 1,
    tokens: {
      usdc: '0xA0b86a33E6441b8f7C5b4681c42E9E3b3d3D08F5',
      eth: '0x0000000000000000000000000000000000000000'
    }
  }
};

export function parseBridgeCommand(text: string): BridgeRequest | null {
  // Parse commands like "bridge 10 usdc from base to mantle"
  const bridgeRegex = /bridge\s+(\d+(?:\.\d+)?)\s+(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/i;
  const match = text.match(bridgeRegex);
  
  if (!match) {
    return null;
  }

  const [, amount, token, fromChain, toChain] = match;
  
  // Validate chains
  const fromChainConfig = SUPPORTED_CHAINS[fromChain.toLowerCase()];
  const toChainConfig = SUPPORTED_CHAINS[toChain.toLowerCase()];
  
  if (!fromChainConfig || !toChainConfig) {
    return null;
  }

  // Validate token
  const tokenLower = token.toLowerCase();
  const tokenAddress = fromChainConfig.tokens[tokenLower];
  
  if (!tokenAddress) {
    return null;
  }

  // Default user address for quotes (using the working address from squidQuote.ts)
  const userAddress = '0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125';

  return {
    amount,
    token: tokenLower,
    fromChain: fromChain.toLowerCase(),
    toChain: toChain.toLowerCase(),
    fromChainId: fromChainConfig.chainId,
    toChainId: toChainConfig.chainId,
    tokenAddress,
    userAddress
  };
}

export function getTokenDecimals(token: string): number {
  switch (token.toLowerCase()) {
    case 'usdc':
      return 6;
    case 'eth':
      return 18;
    default:
      return 6;
  }
}

export function formatTokenAmount(amount: string, token: string): string {
  const decimals = getTokenDecimals(token);
  const amountNum = parseFloat(amount);
  return (amountNum * Math.pow(10, decimals)).toString();
}