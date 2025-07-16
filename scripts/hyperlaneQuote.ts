import { loadDevVars, validateEnv } from './utils/envLoader';

const env = loadDevVars();

validateEnv(env, ['BASE_RPC_URL', 'MANTLE_RPC_URL']);

const rpcUrls = {
  base: env.BASE_RPC_URL,
  mantle: env.MANTLE_RPC_URL,
};

const usdcConfig = {
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  decimals: 6,
  symbol: 'USDC',
};

const amount = 10 * 10 ** 6; // 10 USDC (6 decimals)

async function getQuote() {
  try {
    console.log('🔄 Getting quote for bridging 10 USDC from Base to Mantle...');
    console.log('Configuration:');
    console.log('  - Base RPC:', rpcUrls.base.substring(0, 50) + '...');
    console.log('  - Mantle RPC:', rpcUrls.mantle.substring(0, 50) + '...');
    console.log('  - USDC Address:', usdcConfig.address);
    console.log('  - Amount:', amount, 'USDC units (10 USDC)');
    
    // Basic quote structure - in a real implementation, this would
    // connect to Hyperlane's quote API or SDK
    const quote = {
      amount: amount.toString(),
      amountFormatted: '10.0 USDC',
      fromChain: 'base',
      toChain: 'mantle',
      token: usdcConfig,
      estimatedTime: '5-10 minutes',
      estimatedFee: 'TBD - requires Hyperlane SDK integration',
    };

    console.log('✅ Mock Quote Generated:');
    console.log(JSON.stringify(quote, null, 2));
    
    return quote;
  } catch (error) {
    console.error('❌ Error getting quote:', error);
    throw error;
  }
}

// Run the quote function
getQuote().catch(console.error);

export { getQuote };