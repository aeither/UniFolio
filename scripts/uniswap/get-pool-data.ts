// NOTE: You must install jsbi: pnpm add jsbi
import { ChainId, Token } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v4-sdk';
import {
    createPublicClient,
    getContract,
    http,
    parseAbi
} from 'viem';
import { loadEnv, validateEnv } from '../utils/envLoader';

// Custom chain definition for Unichain
const unichain = {
    id: ChainId.UNICHAIN,
    name: 'Unichain',
    network: 'unichain',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [''], // Will be filled from environment
        },
        public: {
            http: [''], // Will be filled from environment
        },
    },
};

// Unichain config
const STATE_VIEW_ADDRESS = '0x86e8631a016f9068c3f085faf484ee3f5fdee8f2';
const ETH_TOKEN = new Token(
    ChainId.UNICHAIN,
    '0x0000000000000000000000000000000000000000',
    18,
    'ETH',
    'Ether'
);
const USDC_TOKEN = new Token(
    ChainId.UNICHAIN,
    '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    6,
    'USDC',
    'USDC'
);
const POOL_KEY = {
    currency0: ETH_TOKEN.address < USDC_TOKEN.address ? ETH_TOKEN.address : USDC_TOKEN.address,
    currency1: ETH_TOKEN.address < USDC_TOKEN.address ? USDC_TOKEN.address : ETH_TOKEN.address,
    fee: 500,
    tickSpacing: 10,
    hooks: '0x0000000000000000000000000000000000000000',
};

// StateView ABI (minimal for pool info)
const STATE_VIEW_ABI = parseAbi([
    'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)'
]);

async function main() {
    // Debug: Verify constants are defined
    console.log('STATE_VIEW_ADDRESS:', STATE_VIEW_ADDRESS);
    console.log('typeof STATE_VIEW_ADDRESS:', typeof STATE_VIEW_ADDRESS);

    // Load env
    const env = loadEnv();
    validateEnv(env as unknown as Record<string, string>, ['ETHEREUM_RPC_URL']);
    const envVars = env as unknown as { ETHEREUM_RPC_URL: string };

    // Update chain with RPC URL
    unichain.rpcUrls.default.http[0] = envVars.ETHEREUM_RPC_URL;
    unichain.rpcUrls.public.http[0] = envVars.ETHEREUM_RPC_URL;

    // Client setup
    const client = createPublicClient({
        chain: unichain,
        transport: http(envVars.ETHEREUM_RPC_URL)
    });

    // PoolId
    const poolId = Pool.getPoolId(
        ETH_TOKEN,
        USDC_TOKEN,
        POOL_KEY.fee,
        POOL_KEY.tickSpacing,
        POOL_KEY.hooks
    );

    console.log('Pool ID:', poolId);

    // Create contract instance
    const stateViewContract = getContract({
        address: STATE_VIEW_ADDRESS as `0x${string}`,
        abi: STATE_VIEW_ABI,
        client,
    });

    // Fetch slot0 and liquidity using individual calls
    const slot0 = await stateViewContract.read.getSlot0([poolId as `0x${string}`]);
    const liquidity = await stateViewContract.read.getLiquidity([poolId as `0x${string}`]);

    if (!slot0 || !liquidity) {
        throw new Error('Failed to fetch pool state');
    }

    const sqrtPriceX96 = slot0[0];
    const currentTick = Number(slot0[1]);
    const poolLiquidity = liquidity;

    // Print pool summary
    console.log('\n--- Pool Data ---');
    console.log('Pool ID:', poolId);
    console.log('Current tick:', currentTick);
    console.log('Liquidity:', poolLiquidity.toString());
    console.log('SqrtPriceX96:', sqrtPriceX96.toString());
}

main().catch(console.error);