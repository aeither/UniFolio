import { WarpSdk, ChainMap, Chains, TokenConfig } from '@hyperlane-xyz/sdk';
import { loadDevVars, validateEnv } from './utils/envLoader';

const env = loadDevVars();

validateEnv(env, ['BASE_RPC_URL', 'MANTLE_RPC_URL']);

const rpcUrls: ChainMap<string> = {
  [Chains.BASE]: env.BASE_RPC_URL,
  [Chains.MANTLE]: env.MANTLE_RPC_URL,
};

const usdcBaseConfig: TokenConfig = {
  chain: Chains.BASE,
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  decimals: 6,
  symbol: 'USDC',
};

const sdk = new WarpSdk({
  rpcUrls,
});

const amount = 10 * 10 ** usdcBaseConfig.decimals; // 10 USDC (6 decimals)

async function getQuote() {
  try {
    console.log('🔄 Getting quote for bridging 10 USDC from Base to Mantle...');
    
    const quote = await sdk.getQuote({
      fromChain: Chains.BASE,
      toChain: Chains.MANTLE,
      token: usdcBaseConfig,
      amount: amount.toString(),
    });

    console.log('✅ Bridge quote:', quote);
    
    return quote;
  } catch (error) {
    console.error('❌ Error getting quote:', error);
    throw error;
  }
}

if (import.meta.main) {
  getQuote().catch(console.error);
}

export { getQuote };