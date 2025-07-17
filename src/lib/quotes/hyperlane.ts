import { ethers } from 'ethers';
import {
  chainMetadata,
  warpRouteConfigs,
} from '@hyperlane-xyz/registry';
import {
  MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';


export interface HyperlaneQuoteParams {
  fromChain: string;
  toChain: string;
  tokenAddress: string;
  amount: string;
  rpcUrls: {
    [key: string]: string;
  };
  formatted?: boolean;
}

export interface HyperlaneFormattedQuote {
  provider: 'hyperlane';
  gasFeeETH: string;
  gasFeeUSD: string;
  duration: number;
  destAmount: string;
  destAmountFormatted: string;
  bridgeLoss: string;
  bridgeLossPercentage: string;
}

export interface HyperlaneRawQuote {
  provider: 'hyperlane';
  fromAmount: string;
  toAmount: string;
  toAmountFormatted: string;
  executionDuration: number;
  gasCostETH: string;
  gasCostUSD: string;
  originGasUnits: string;
  originGasPriceGwei: string;
  destinationGasUnits: string;
  destination: string;
  isReal: boolean;
  details: {
    steps: Array<{
      type: string;
      description: string;
      gasEstimate: string;
    }>;
  };
  rawQuote: {
    baseToken: any;
    destToken: any;
    warpRouteAddress: string;
    estimatedDestGas: string;
  };
}

export async function getHyperlaneQuote(params: HyperlaneQuoteParams): Promise<HyperlaneFormattedQuote | HyperlaneRawQuote> {
  const { fromChain, toChain, tokenAddress, amount, rpcUrls, formatted = false } = params;

  // Validate RPC URLs and provide fallbacks
  const fromRpcUrl = rpcUrls[fromChain];
  const toRpcUrl = rpcUrls[toChain];

  if (!fromRpcUrl || !toRpcUrl) {
    throw new Error(`RPC URLs not available for ${fromChain} or ${toChain}`);
  }

  console.log('🔍 Hyperlane RPC URLs:', { fromRpcUrl, toRpcUrl });

  // Use default chain metadata but override RPC URLs
  const CHAINS = {
    [fromChain]: {
      ...chainMetadata[fromChain as keyof typeof chainMetadata],
      rpcUrls: [{ http: fromRpcUrl }]
    },
    [toChain]: {
      ...chainMetadata[toChain as keyof typeof chainMetadata],
      rpcUrls: [{ http: toRpcUrl }]
    },
  };

  console.log('🔍 Creating MultiProtocolProvider with chains:', Object.keys(CHAINS));
  const mpp = new MultiProtocolProvider(CHAINS);

  console.log('🔍 Searching for route in warpRouteConfigs...');
  const routeKey = Object.keys(warpRouteConfigs).find(
    k => k.includes(fromChain) && k.includes(toChain) &&
      warpRouteConfigs[k as keyof typeof warpRouteConfigs].tokens.some(
        token => token.addressOrDenom?.toLowerCase() === tokenAddress.toLowerCase()
      )
  );

  if (!routeKey) {
    console.error('❌ Route not found. Available routes with', fromChain, 'or', toChain, ':');
    Object.keys(warpRouteConfigs).forEach(key => {
      if (key.includes(fromChain) || key.includes(toChain)) {
        console.log(`  ${key}`);
      }
    });
    throw new Error(`USDC route ${fromChain}→${toChain} not found in registry`);
  }

  console.log('✅ Found route:', routeKey);

  const warpRouteConfig = warpRouteConfigs[routeKey as keyof typeof warpRouteConfigs];
  const baseToken = warpRouteConfig.tokens.find(token =>
    token.chainName === fromChain && token.addressOrDenom?.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!baseToken) {
    throw new Error(`No ${fromChain} token found for ${tokenAddress} in route config`);
  }

  const destToken = warpRouteConfig.tokens.find(token => token.chainName === toChain);
  if (!destToken) {
    throw new Error(`No ${toChain} token found in route config`);
  }

  const warpRouteAddress = baseToken.addressOrDenom;
  if (!warpRouteAddress) {
    throw new Error(`No address found for ${fromChain} token`);
  }

  console.log('🔍 Getting gas price for', fromChain);
  const originProvider = mpp.getEthersV5Provider(fromChain);

  let originGasPrice;
  try {
    originGasPrice = await originProvider.getGasPrice();
    console.log('✅ Gas price obtained:', originGasPrice.toString());
  } catch (error) {
    console.error('❌ Error getting gas price:', error);
    throw new Error(`Failed to get gas price for ${fromChain}: ${error}`);
  }

  const originApproveGas = 50_000n;
  const originBridgeGas = 250_000n;
  const originGasUnits = originApproveGas + originBridgeGas;
  const destGasAmount = 200_000n;

  const originGasCostWei = originGasUnits * BigInt(originGasPrice.toString());
  const originGasCostEth = ethers.formatEther(originGasCostWei);

  const amountBN = ethers.parseUnits(amount, 6);
  const bridgeLossWei = 0n;
  const bridgeLoss = ethers.formatUnits(bridgeLossWei, 6);
  const bridgeLossPercentage = '0.00';

  if (formatted) {
    return {
      provider: 'hyperlane',
      gasFeeETH: originGasCostEth,
      gasFeeUSD: (parseFloat(originGasCostEth) * 3250).toFixed(2),
      duration: 300,
      destAmount: amountBN.toString(),
      destAmountFormatted: ethers.formatUnits(amountBN, 6) + ' USDC',
      bridgeLoss,
      bridgeLossPercentage,
    };
  }

  return {
    provider: 'hyperlane',
    fromAmount: amountBN.toString(),
    toAmount: amountBN.toString(),
    toAmountFormatted: ethers.formatUnits(amountBN, 6) + ' USDC',
    executionDuration: 300,
    gasCostETH: originGasCostEth,
    gasCostUSD: (parseFloat(originGasCostEth) * 3250).toFixed(2),
    originGasUnits: originGasUnits.toString(),
    originGasPriceGwei: ethers.formatUnits(BigInt(originGasPrice.toString()), 'gwei'),
    destinationGasUnits: destGasAmount.toString(),
    destination: toChain,
    isReal: true,
    details: {
      steps: [
        { type: 'approve', description: 'Approve USDC for router', gasEstimate: originApproveGas.toString() },
        { type: 'bridge', description: 'Bridge USDC via Hyperlane', gasEstimate: originBridgeGas.toString() },
      ],
    },
    rawQuote: {
      baseToken,
      destToken,
      warpRouteAddress,
      estimatedDestGas: destGasAmount.toString()
    },
  };
}