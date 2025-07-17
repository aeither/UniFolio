import { ethers } from 'ethers';
import {
  chainMetadata,
  warpRouteConfigs,
} from '@hyperlane-xyz/registry';
import {
  MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';

// ----------- Type Definitions -----------
export interface HyperlaneQuoteParams {
  fromChain: string;
  toChain: string;
  tokenAddress: string;
  amount: string; // Human-readable, e.g. '10'
  rpcUrls: Record<string, string>;
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

// ----------- Main Quote Function -----------
export async function getHyperlaneQuote(
  params: HyperlaneQuoteParams
): Promise<HyperlaneFormattedQuote | HyperlaneRawQuote> {
  const { fromChain, toChain, tokenAddress, amount, rpcUrls, formatted = false } = params;

  // 1. Validate input and RPC URLs
  const fromRpcUrl = rpcUrls[fromChain];
  const toRpcUrl = rpcUrls[toChain];
  if (!fromRpcUrl || !toRpcUrl)
    throw new Error(`RPC URLs not available for ${fromChain} or ${toChain}`);

  // 2. Construct correct MultiProtocolProvider with Node-based RPCs
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
  const mpp = new MultiProtocolProvider(CHAINS);

  // 3. Find correct warp route for token
  const routeKey = Object.keys(warpRouteConfigs).find(
    k => k.includes(fromChain) && k.includes(toChain) &&
      warpRouteConfigs[k as keyof typeof warpRouteConfigs].tokens.some(
        token => token.addressOrDenom?.toLowerCase() === tokenAddress.toLowerCase()
      )
  );
  if (!routeKey)
    throw new Error(`Token route ${fromChain}→${toChain} not found in warpRouteConfigs`);

  const warpRouteConfig = warpRouteConfigs[routeKey as keyof typeof warpRouteConfigs];

  // 4. Map origin/destination tokens
  const baseToken = warpRouteConfig.tokens.find(
    token => token.chainName === fromChain && token.addressOrDenom?.toLowerCase() === tokenAddress.toLowerCase()
  );
  if (!baseToken)
    throw new Error(`No ${fromChain} token found for address ${tokenAddress} in route config`);

  const destToken = warpRouteConfig.tokens.find(token => token.chainName === toChain);
  if (!destToken)
    throw new Error(`No ${toChain} token found in route config`);

  const warpRouteAddress = baseToken.addressOrDenom || '';
  if (!warpRouteAddress)
    throw new Error(`No address found for ${fromChain} token`);

  // 5. Gas estimate
  const originProvider = mpp.getEthersV5Provider(fromChain);
  let originGasPrice;
  try {
    originGasPrice = await originProvider.getGasPrice();
  } catch (error) {
    throw new Error(`Failed to get gas price for ${fromChain}: ${error}`);
  }
  const originApproveGas = 50_000n;
  const originBridgeGas = 250_000n;
  const originGasUnits = originApproveGas + originBridgeGas;
  const destGasAmount = 200_000n;

  const originGasCostWei = originGasUnits * BigInt(originGasPrice.toString());
  const originGasCostEth = ethers.formatEther(originGasCostWei);

  // 6. Amounts and bridge loss (stubbed here as 0)
  const amountBN = ethers.parseUnits(amount, 6);
  const bridgeLossWei = 0n;
  const bridgeLoss = ethers.formatUnits(bridgeLossWei, 6);
  const bridgeLossPercentage = '0.00';

  // 7. Response (formatted or raw)
  if (formatted) {
    return {
      provider: 'hyperlane',
      gasFeeETH: originGasCostEth,
      gasFeeUSD: (parseFloat(originGasCostEth) * 3250).toFixed(2), // Example ETH price
      duration: 300, // seconds (simulated)
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
