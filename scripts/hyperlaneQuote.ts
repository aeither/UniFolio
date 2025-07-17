// Suppress bigint warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (!warning.message.includes('bigint: Failed to load bindings')) {
    console.warn(warning);
  }
});

import { ethers } from 'ethers';
import {
  chainMetadata,
  warpRouteConfigs,
} from '@hyperlane-xyz/registry';
import {
  MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';
import { loadEnv, validateEnv } from './utils/envLoader';

const ORIGIN = 'base';
const DEST = 'arbitrum';
const USDC = '0x955132016f9B6376B1392aA7BFF50538d21Ababc';  // USDC on Base
const AMOUNT = ethers.parseUnits('10', 6);  // 10 USDC

// Load environment variables
const env = loadEnv();
validateEnv(env as unknown as Record<string, string>, ['BASE_RPC_URL', 'ARBITRUM_RPC_URL']);

const CHAINS = {
  base:     { ...chainMetadata.base,     rpcUrls: [{ http: env.BASE_RPC_URL! }] },
  arbitrum: { ...chainMetadata.arbitrum, rpcUrls: [{ http: env.ARBITRUM_RPC_URL! }] },
};

const mpp = new MultiProtocolProvider(CHAINS);

// --------- Find the warp route config for USDC, base→mantle ---------
console.log('🔍 Available warp routes:');
Object.keys(warpRouteConfigs).forEach(key => {
  if (key.includes('base') || key.includes('mantle')) {
    console.log(`  - ${key}`);
  }
});

const routeKey = Object.keys(warpRouteConfigs).find(
  k => k.includes('base') && k.includes('arbitrum') && 
       warpRouteConfigs[k as keyof typeof warpRouteConfigs].tokens.some(
         token => token.addressOrDenom?.toLowerCase() === USDC.toLowerCase()
       )
);

if (!routeKey) {
  console.error('❌ USDC route Base→Arbitrum not found in registry');
  console.log('Available routes with Base or Arbitrum:');
  Object.keys(warpRouteConfigs).forEach(key => {
    if (key.includes('base') || key.includes('arbitrum')) {
      const config = warpRouteConfigs[key as keyof typeof warpRouteConfigs];
      console.log(`  ${key}: ${config.tokens.map(t => t.addressOrDenom).join(', ')}`);
    }
  });
  throw new Error('USDC route Base→Arbitrum not found in registry');
}

const warpRouteConfig = warpRouteConfigs[routeKey as keyof typeof warpRouteConfigs];

// --------- Get the contract address on origin (Base) ---------
console.log('🔍 Found warp route config:', routeKey);
console.log('🔍 Warp route config structure:', JSON.stringify(warpRouteConfig, null, 2));

// Find the Base token in the route config
const baseToken = warpRouteConfig.tokens.find(token => 
  token.chainName === ORIGIN && token.addressOrDenom?.toLowerCase() === USDC.toLowerCase()
);

if (!baseToken) {
  throw new Error(`No Base token found for USDC (${USDC}) in route config`);
}

console.log('🔍 Base token found:', baseToken);

// --------- Simplified quote without using EvmERC20WarpRouteReader ---------
(async () => {
  // Use the token address as the warp route address
  const warpRouteAddress = baseToken.addressOrDenom;
  if (!warpRouteAddress) {
    throw new Error('No address found for Base USDC token');
  }
  
  console.log('🔍 Using warp route address:', warpRouteAddress);
  
  // Find destination token (arbitrum)
  const destToken = warpRouteConfig.tokens.find(token => token.chainName === DEST);
  if (!destToken) {
    throw new Error(`No ${DEST} token found in route config`);
  }
  
  console.log('🔍 Destination token found:', destToken);
  
  // Estimate destination gas (typical values for cross-chain transfers)
  const destGasAmount = 200_000n;

  // --------- Origin-side gas quote -----------
  const originProvider = mpp.getEthersV5Provider(ORIGIN);
  const originGasPrice = await originProvider.getGasPrice();
  
  // Estimate additional origin-side gas for approval + bridge (often 50k + 250k)
  const originApproveGas = 50_000n;
  const originBridgeGas  = 250_000n;

  // Calculate cost of destination gas (Hyperlane makes user pay for dest gas upfront in origin ETH)
  // Here, you would use actual Hyperlane paymaster contract, usually an "estimatePaymentForGas" API.
  // For demo, assume a conversion: 200k gas on dest * 1 gwei * dest-to-ETH equivalence.
  // Here we'll only estimate origin gas cost:

  const originGasUnits = originApproveGas + originBridgeGas;
  const totalOriginGas = originGasUnits; // exclude dest for simplicity
  // Convert ethers v5 BigNumber to BigInt for calculation
  const originGasCostWei = totalOriginGas * BigInt(originGasPrice.toString());
  const originGasCostEth = ethers.formatEther(originGasCostWei);

  // For now, we'll just print out the details
  console.log({
    provider: 'hyperlane',
    fromAmount: AMOUNT.toString(),
    toAmount:   AMOUNT.toString(),
    toAmountFormatted: ethers.formatUnits(AMOUNT, 6) + ' USDC',
    executionDuration: 300,
    gasCostETH: originGasCostEth,
    gasCostUSD: (parseFloat(originGasCostEth) * 3250).toFixed(2), // replace with live ETH
    originGasUnits: originGasUnits.toString(),
    originGasPriceGwei: ethers.formatUnits(BigInt(originGasPrice.toString()), 'gwei'),
    destinationGasUnits: destGasAmount.toString(),
    destination: DEST,
    isReal: false, // Set to false since we're using estimated values
    details: {
      steps: [
        { type: 'approve',        description: 'Approve USDC for router',  gasEstimate: originApproveGas.toString() },
        { type: 'bridge',         description: 'Bridge USDC via Hyperlane', gasEstimate: originBridgeGas.toString() },
      ],
    },
    rawQuote: { 
      baseToken,
      destToken,
      warpRouteAddress,
      estimatedDestGas: destGasAmount.toString()
    },
  });
})();
