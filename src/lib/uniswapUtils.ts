import { ChainId, Ether, Percent, Token } from '@uniswap/sdk-core';
import { type MintOptions, Pool, Position, V4PositionManager } from '@uniswap/v4-sdk';
import { nearestUsableTick } from '@uniswap/v3-sdk';
import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    zeroAddress
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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

// Contract addresses for Unichain
const STATE_VIEW_ADDRESS = '0x86e8631a016f9068c3f085faf484ee3f5fdee8f2';
const POSITION_MANAGER_ADDRESS = '0x4529a01c7a0410167c5740c487a8de60232617bf';

// Token definitions for Unichain
const ETH_TOKEN = new Token(
    ChainId.UNICHAIN,
    zeroAddress,
    18,
    'ETH',
    'Ether'
);

const NATIVE_ETH = Ether.onChain(ChainId.UNICHAIN);

const USDC_TOKEN = new Token(
    ChainId.UNICHAIN,
    '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    6,
    'USDC',
    'USDC'
);

const WBTC_TOKEN = new Token(
    ChainId.UNICHAIN,
    '0x078D782b760474a361dDA0AF3839290b0EF57AD6', // Placeholder - would need actual WBTC address
    8,
    'WBTC',
    'Wrapped Bitcoin'
);

// StateView ABI for fetching pool state
const STATE_VIEW_ABI = [
    {
        "inputs": [
            {"internalType": "PoolId", "name": "poolId", "type": "bytes32"}
        ],
        "name": "getSlot0",
        "outputs": [
            {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"internalType": "int24", "name": "tick", "type": "int24"},
            {"internalType": "uint24", "name": "protocolFee", "type": "uint24"},
            {"internalType": "uint24", "name": "lpFee", "type": "uint24"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "PoolId", "name": "poolId", "type": "bytes32"}
        ],
        "name": "getLiquidity",
        "outputs": [
            {"internalType": "uint128", "name": "liquidity", "type": "uint128"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Position Manager ABI
const POSITION_MANAGER_ABI = [
    {
        "inputs": [
            {"internalType": "bytes[]", "name": "data", "type": "bytes[]"}
        ],
        "name": "multicall",
        "outputs": [
            {"internalType": "bytes[]", "name": "results", "type": "bytes[]"}
        ],
        "stateMutability": "payable",
        "type": "function"
    }
] as const;

export interface UniswapPool {
    name: string;
    token0: string;
    token1: string;
    fee: number;
    apr: string;
    tvl: string;
    volume24h: string;
    description: string;
}

export interface AddLiquidityParams {
    pool: string; // e.g., "ETH/USDC"
    ethAmount?: string;
    usdcAmount?: string;
    fee?: number;
    tickRange?: number;
    slippageTolerance?: number;
    userAddress: string;
    rpcUrl: string;
    privateKey: string;
}

export function getBestUniswapPools(): UniswapPool[] {
    // Mock data based on the image showing top Uniswap pools
    return [
        {
            name: "ETH/WBTC",
            token0: "ETH",
            token1: "WBTC", 
            fee: 500, // 0.05%
            apr: "10.6%",
            tvl: "$22.5M",
            volume24h: "$36.1M",
            description: "High volume ETH/WBTC pair with competitive yields"
        },
        {
            name: "WBTC/USDT",
            token0: "WBTC",
            token1: "USDT",
            fee: 500, // 0.05%
            apr: "9.22%", 
            tvl: "$74.2M",
            volume24h: "$39.1M",
            description: "Stable BTC exposure with good liquidity"
        },
        {
            name: "ETH/USDT",
            token0: "ETH", 
            token1: "USDT",
            fee: 500, // 0.05%
            apr: "8.07%",
            tvl: "$156.4M",
            volume24h: "$61.5M", 
            description: "Popular ETH/stablecoin pair for yield farming"
        },
        {
            name: "ETH/USDC",
            token0: "ETH",
            token1: "USDC",
            fee: 500, // 0.05%
            apr: "5.39%",
            tvl: "$301.8M", 
            volume24h: "$119.2M",
            description: "⭐ Most liquid ETH/USDC pair - perfect for beginners"
        },
        {
            name: "WBTC/USDC",
            token0: "WBTC",
            token1: "USDC", 
            fee: 3000, // 0.3%
            apr: "4.73%",
            tvl: "$12.2M",
            volume24h: "$39.1M",
            description: "BTC exposure with USDC stability"
        }
    ];
}

export function formatPoolsForTelegram(pools: UniswapPool[]): string {
    let message = "🏊‍♂️ **Best Uniswap Pools for Farming**\n\n";
    
    pools.forEach((pool, index) => {
        const star = pool.name === "ETH/USDC" ? "⭐ " : "";
        message += `${star}**${index + 1}. ${pool.name}**\n`;
        message += `💰 APR: ${pool.apr}\n`;
        message += `🏦 TVL: ${pool.tvl}\n`;
        message += `📊 24h Volume: ${pool.volume24h}\n`;
        message += `💼 Fee: ${(pool.fee / 10000)}%\n`;
        message += `📝 ${pool.description}\n\n`;
    });
    
    message += "💡 *Tip: ETH/USDC is recommended for beginners due to high liquidity and lower impermanent loss risk.*\n\n";
    message += "To add liquidity, type: **add liquidity to ETH/USDC**";
    
    return message;
}

// Helper function for proper token ordering
function orderTokensAndTicks(tokenA: Token, tokenB: Token, tickLower: number, tickUpper: number) {
    let token0: Token, token1: Token;
    let adjustedTickLower: number, adjustedTickUpper: number;
    
    if (tokenA.address.toLowerCase() < tokenB.address.toLowerCase()) {
        token0 = tokenA;
        token1 = tokenB;
        adjustedTickLower = tickLower;
        adjustedTickUpper = tickUpper;
    } else {
        token0 = tokenB;
        token1 = tokenA;
        adjustedTickLower = -tickUpper;
        adjustedTickUpper = -tickLower;
    }
    
    return { token0, token1, adjustedTickLower, adjustedTickUpper };
}

// Function to calculate proper amounts based on token order
function calculateTokenAmounts(
    ethAmount: string,
    usdcAmount: string,
    token0: Token,
    token1: Token
): { amount0: string; amount1: string } {
    const ethAmountWei = parseUnits(ethAmount, ETH_TOKEN.decimals);
    const usdcAmountWei = parseUnits(usdcAmount, USDC_TOKEN.decimals);
    
    const isEthToken0 = token0.address.toLowerCase() === ETH_TOKEN.address.toLowerCase();
    
    return {
        amount0: isEthToken0 ? ethAmountWei.toString() : usdcAmountWei.toString(),
        amount1: isEthToken0 ? usdcAmountWei.toString() : ethAmountWei.toString()
    };
}

async function fetchPoolState(
    publicClient: any,
    token0: Token,
    token1: Token,
    fee: number,
    tickSpacing: number,
    hookAddress: string
) {
    const poolId = Pool.getPoolId(token0, token1, fee, tickSpacing, hookAddress);

    const [slot0, liquidity] = await Promise.all([
        publicClient.readContract({
            address: STATE_VIEW_ADDRESS as `0x${string}`,
            abi: STATE_VIEW_ABI,
            functionName: 'getSlot0',
            args: [poolId as `0x${string}`],
        }),
        publicClient.readContract({
            address: STATE_VIEW_ADDRESS as `0x${string}`,
            abi: STATE_VIEW_ABI,
            functionName: 'getLiquidity',
            args: [poolId as `0x${string}`],
        }),
    ]);

    return {
        sqrtPriceX96Current: slot0[0] as bigint,
        currentTick: slot0[1] as number,
        currentLiquidity: liquidity as bigint,
        poolId
    };
}

async function createPosition(
    ethAmount: string,
    usdcAmount: string,
    fee: number,
    tickRange: number,
    tickSpacing: number,
    hookAddress: string,
    sqrtPriceX96Current: bigint,
    currentLiquidity: bigint,
    currentTick: number
) {
    const { token0, token1, adjustedTickLower: baseLower, adjustedTickUpper: baseUpper } = 
        orderTokensAndTicks(ETH_TOKEN, USDC_TOKEN, -tickRange, tickRange);
    
    const tickLower = nearestUsableTick(currentTick + baseLower, tickSpacing);
    const tickUpper = nearestUsableTick(currentTick + baseUpper, tickSpacing);
    
    const { amount0, amount1 } = calculateTokenAmounts(ethAmount, usdcAmount, token0, token1);
    
    const currency0 = token0.address.toLowerCase() === zeroAddress.toLowerCase() ? NATIVE_ETH : token0;
    const currency1 = token1.address.toLowerCase() === zeroAddress.toLowerCase() ? NATIVE_ETH : token1;
    
    const pool = new Pool(
        currency0,
        currency1,
        fee,
        tickSpacing,
        hookAddress,
        sqrtPriceX96Current.toString(),
        currentLiquidity.toString(),
        currentTick
    );
    
    const position = Position.fromAmounts({
        pool,
        tickLower,
        tickUpper,
        amount0,
        amount1,
        useFullPrecision: true,
    });
    
    if (position.liquidity.toString() === '0') {
        throw new Error('Position has zero liquidity - check token amounts and tick range');
    }
    
    return position;
}

export async function addLiquidityToPool(params: AddLiquidityParams): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    message: string;
}> {
    try {
        // Default values for ETH/USDC pool
        const ethAmount = params.ethAmount || '0.0001';
        const usdcAmount = params.usdcAmount || '0.3';
        const fee = params.fee || 500;
        const tickRange = params.tickRange || 1000;
        const slippage = params.slippageTolerance || 0.5;

        // Validation
        if (parseFloat(ethAmount) <= 0 || parseFloat(usdcAmount) <= 0) {
            return {
                success: false,
                error: 'Invalid amounts',
                message: 'ETH and USDC amounts must be greater than 0'
            };
        }

        // Update chain with RPC URL
        unichain.rpcUrls.default.http[0] = params.rpcUrl;
        unichain.rpcUrls.public.http[0] = params.rpcUrl;

        // Set up clients
        const publicClient = createPublicClient({
            chain: unichain,
            transport: http(params.rpcUrl)
        });

        const account = privateKeyToAccount(params.privateKey as `0x${string}`);

        const walletClient = createWalletClient({
            account,
            chain: unichain,
            transport: http(params.rpcUrl)
        });

        // Step 1: Fetch pool state
        const poolState = await fetchPoolState(
            publicClient,
            ETH_TOKEN,
            USDC_TOKEN,
            fee,
            10, // tickSpacing for 0.05% fee tier
            zeroAddress
        );

        // Step 2: Create position
        const position = await createPosition(
            ethAmount,
            usdcAmount,
            fee,
            tickRange,
            10, // tickSpacing
            zeroAddress,
            poolState.sqrtPriceX96Current,
            poolState.currentLiquidity,
            poolState.currentTick
        );

        // Step 3: Prepare mint options
        const currentBlock = await publicClient.getBlock();
        const currentBlockTimestamp = Number(currentBlock.timestamp);
        const deadline = currentBlockTimestamp + (20 * 60); // 20 minutes

        const slippagePct = new Percent(Math.floor(slippage * 100), 10_000);

        const mintOptions: MintOptions = {
            recipient: params.userAddress,
            slippageTolerance: slippagePct,
            deadline: deadline.toString(),
            useNative: NATIVE_ETH,
            hookData: '0x',
        };

        // Step 4: Execute transaction
        const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions);

        const txHash = await walletClient.writeContract({
            address: POSITION_MANAGER_ADDRESS as `0x${string}`,
            abi: POSITION_MANAGER_ABI,
            functionName: 'multicall',
            args: [[calldata as `0x${string}`]],
            value: BigInt(value),
        });

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });

        return {
            success: true,
            txHash: receipt.transactionHash,
            message: `✅ Successfully added liquidity to ${params.pool}!\n\nTransaction: ${receipt.transactionHash}\nBlock: ${receipt.blockNumber}`
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            error: errorMessage,
            message: `❌ Failed to add liquidity: ${errorMessage}`
        };
    }
} 