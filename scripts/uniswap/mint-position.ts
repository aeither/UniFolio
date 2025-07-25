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

// Contract addresses for Unichain
const STATE_VIEW_ADDRESS = '0x86e8631a016f9068c3f085faf484ee3f5fdee8f2';
const POSITION_MANAGER_ADDRESS = '0x4529a01c7a0410167c5740c487a8de60232617bf';

// Token definitions for Unichain
// Use zeroAddress for native ETH in Uniswap V4
const ETH_TOKEN = new Token(
    ChainId.UNICHAIN,
    zeroAddress,
    18,
    'ETH',
    'Ether'
);

// For native token operations
const NATIVE_ETH = Ether.onChain(ChainId.UNICHAIN);

const USDC_TOKEN = new Token(
    ChainId.UNICHAIN,
    '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    6,
    'USDC',
    'USDC'
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


interface MintPositionParams {
    ethAmount: string;      // Amount of ETH to deposit
    usdcAmount: string;     // Amount of USDC to deposit
    fee: number;
    tickRange: number;      // Range around current tick
    slippageTolerance: number;
    recipient: string;
    usePermit2?: boolean;
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
        // When tokens are swapped, ticks need to be negated and swapped
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
    
    // Determine which token is token0 and token1
    const isEthToken0 = token0.address.toLowerCase() === ETH_TOKEN.address.toLowerCase();
    
    return {
        amount0: isEthToken0 ? ethAmountWei.toString() : usdcAmountWei.toString(),
        amount1: isEthToken0 ? usdcAmountWei.toString() : ethAmountWei.toString()
    };
}

// Validation function
function validatePositionParams(ethAmount: string, usdcAmount: string, tickRange: number) {
    const ethAmountNum = parseFloat(ethAmount);
    const usdcAmountNum = parseFloat(usdcAmount);
    
    if (ethAmountNum <= 0) {
        throw new Error('ETH amount must be greater than 0');
    }
    
    if (usdcAmountNum <= 0) {
        throw new Error('USDC amount must be greater than 0');
    }
    
    if (tickRange <= 0) {
        throw new Error('Tick range must be greater than 0');
    }
    
    // Minimum amounts to avoid dust
    if (ethAmountNum < 0.00001) {
        throw new Error('ETH amount too small (minimum 0.00001 ETH)');
    }
    
    if (usdcAmountNum < 0.01) {
        throw new Error('USDC amount too small (minimum 0.01 USDC)');
    }
}

async function fetchPoolState(
    publicClient: any,
    token0: Token,
    token1: Token,
    fee: number,
    tickSpacing: number,
    hookAddress: string
) {
    console.log('🔍 Fetching pool state...');

    // Get pool ID using SDK helper
    const poolId = Pool.getPoolId(token0, token1, fee, tickSpacing, hookAddress);
    console.log(`Pool ID: ${poolId}`);

    // Fetch current pool state from the blockchain
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

    // Extract relevant data
    const sqrtPriceX96Current = slot0[0] as bigint;
    const currentTick = slot0[1] as number;
    const currentLiquidity = liquidity as bigint;

    console.log(`Current tick: ${currentTick}`);
    console.log(`Current liquidity: ${currentLiquidity.toString()}`);
    console.log(`Current sqrt price: ${sqrtPriceX96Current.toString()}`);

    return {
        sqrtPriceX96Current,
        currentTick,
        currentLiquidity,
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
    console.log('🏗️ Creating position...');
    
    // Step 1: Order tokens properly
    const { token0, token1, adjustedTickLower: baseLower, adjustedTickUpper: baseUpper } = 
        orderTokensAndTicks(ETH_TOKEN, USDC_TOKEN, -tickRange, tickRange);
    
    // Step 2: Calculate tick boundaries around current tick using nearestUsableTick
    const tickLower = nearestUsableTick(currentTick + baseLower, tickSpacing);
    const tickUpper = nearestUsableTick(currentTick + baseUpper, tickSpacing);
    
    console.log(`Token order: ${token0.symbol} (${token0.address}) < ${token1.symbol} (${token1.address})`);
    console.log(`Tick range: ${tickLower} to ${tickUpper} (spacing: ${tickSpacing})`);
    
    // Step 3: Calculate amounts based on token order
    const { amount0, amount1 } = calculateTokenAmounts(ethAmount, usdcAmount, token0, token1);
    
    console.log(`Amount0 (${token0.symbol}): ${(Number(amount0) / (10 ** token0.decimals)).toFixed(6)}`);
    console.log(`Amount1 (${token1.symbol}): ${(Number(amount1) / (10 ** token1.decimals)).toFixed(6)}`);
    
    // Step 4: Create Pool instance
    // Use NATIVE_ETH for currency0 if it's ETH, otherwise use the regular token
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
    
    // Step 5: Create position
    const position = Position.fromAmounts({
        pool,
        tickLower,
        tickUpper,
        amount0,
        amount1,
        useFullPrecision: true,
    });
    
    console.log('Position created successfully!');
    console.log(`Position liquidity: ${position.liquidity.toString()}`);
    console.log(`Token0 amount: ${position.amount0.toExact()}`);
    console.log(`Token1 amount: ${position.amount1.toExact()}`);
    
    // Verify position has non-zero liquidity
    if (position.liquidity.toString() === '0') {
        throw new Error('Position has zero liquidity - check token amounts and tick range');
    }
    
    return position;
}


async function executeMintTransaction(
    walletClient: any,
    publicClient: any,
    position: Position,
    mintOptions: MintOptions
) {
    console.log('🚀 Executing mint transaction...');

    // Generate transaction parameters
    const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions);

    console.log('Generated calldata:', calldata);
    console.log('Transaction value:', value);

    // Send the transaction
    const txHash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'multicall',
        args: [[calldata]],
        value: BigInt(value),
    });

    console.log(`Transaction sent! Hash: ${txHash}`);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
    });

    console.log(`Transaction confirmed! Block: ${receipt.blockNumber}`);
    return receipt;
}

async function main() {
    console.log('🏊 Uniswap V4 Position Minter');
    console.log('==============================\n');

    // Check for help flag
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🏊 Uniswap V4 Position Minter');
        console.log('==============================\n');
        console.log('Usage: npx tsx scripts/ethereum/mint-position.ts [options]\n');
        console.log('Options:');
        console.log('  --dry-run                    Simulate the transaction without sending');
        console.log('  --eth=<amount>               Amount of ETH to deposit (default: 0.0001)');
        console.log('  --usdc=<amount>              Amount of USDC to deposit (default: 0.3)');
        console.log('  --fee=<fee>                  Fee tier in basis points (default: 500)');
        console.log('  --tickRange=<range>          Tick range around current price (default: 1000)');
        console.log('  --slippage=<percentage>      Slippage tolerance (default: 0.5)');
        console.log('  --help, -h                   Show this help message\n');
        console.log('Examples:');
        console.log('  npx tsx scripts/ethereum/mint-position.ts --dry-run');
        console.log('  npx tsx scripts/ethereum/mint-position.ts --eth=0.001 --usdc=3.0 --dry-run');
        console.log('  npx tsx scripts/ethereum/mint-position.ts --fee=3000 --tickRange=2000');
        process.exit(0);
    }

    const isDryRun = args.includes('--dry-run');
    
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No transactions will be sent\n');
    }

    // Load environment variables
    const env = loadEnv();
    validateEnv(env as unknown as Record<string, string>, ['ETHEREUM_RPC_URL', 'ETHEREUM_PRIVATE_KEY']);

    const envVars = env as unknown as { ETHEREUM_RPC_URL: string; ETHEREUM_PRIVATE_KEY: string };

    // Update chain with RPC URL
    unichain.rpcUrls.default.http[0] = envVars.ETHEREUM_RPC_URL;
    unichain.rpcUrls.public.http[0] = envVars.ETHEREUM_RPC_URL;

    // Set up clients
    const publicClient = createPublicClient({
        chain: unichain,
        transport: http(envVars.ETHEREUM_RPC_URL)
    });

    const account = privateKeyToAccount(envVars.ETHEREUM_PRIVATE_KEY as `0x${string}`);
    console.log(`Account: ${account.address}`);

    const walletClient = createWalletClient({
        account,
        chain: unichain,
        transport: http(envVars.ETHEREUM_RPC_URL)
    });

    // Parse command line arguments with better defaults
    const ethAmount = args.find(arg => arg.startsWith('--eth='))?.split('=')[1] || '0.0001';
    const usdcAmount = args.find(arg => arg.startsWith('--usdc='))?.split('=')[1] || '0.3';
    const fee = parseInt(args.find(arg => arg.startsWith('--fee='))?.split('=')[1] || '500');
    const tickRange = parseInt(args.find(arg => arg.startsWith('--tickRange='))?.split('=')[1] || '1000');
    const slippage = parseFloat(args.find(arg => arg.startsWith('--slippage='))?.split('=')[1] || '0.5');

    console.log(`\n📊 Position Parameters:`);
    console.log(`ETH amount: ${ethAmount}`);
    console.log(`USDC amount: ${usdcAmount}`);
    console.log(`Fee tier: ${fee} (${fee/10000}%)`);
    console.log(`Tick range: ±${tickRange}`);
    console.log(`Slippage tolerance: ${slippage}%`);

    // Validate parameters
    validatePositionParams(ethAmount, usdcAmount, tickRange);

    const params: MintPositionParams = {
        ethAmount,
        usdcAmount,
        fee,
        tickRange,
        slippageTolerance: slippage,
        recipient: account.address,
        usePermit2: false,
    };

    try {
        // Step 1: Fetch pool state
        const poolState = await fetchPoolState(
            publicClient,
            ETH_TOKEN,
            USDC_TOKEN,
            params.fee,
            10, // tickSpacing for 0.05% fee tier
            zeroAddress
        );

        console.log(`\n🔍 Pool State:`);
        console.log(`Current tick: ${poolState.currentTick}`);
        console.log(`Current liquidity: ${poolState.currentLiquidity.toString()}`);
        console.log(`Current sqrt price: ${poolState.sqrtPriceX96Current.toString()}`);

        // Step 2: Create position with explicit amounts
        const position = await createPosition(
            params.ethAmount,
            params.usdcAmount,
            params.fee,
            params.tickRange,
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

        const slippagePct = new Percent(Math.floor(params.slippageTolerance * 100), 10_000);

        const mintOptions: MintOptions = {
            recipient: params.recipient,
            slippageTolerance: slippagePct,
            deadline: deadline.toString(),
            useNative: NATIVE_ETH,
            hookData: '0x',
        };

        // Step 4: Execute transaction
        if (isDryRun) {
            console.log('\n🔍 DRY RUN - Simulating transaction...');
            const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions);
            console.log('Generated calldata length:', calldata.length);
            console.log('Transaction value:', value);
            console.log('\n✅ Dry run completed successfully!');
        } else {
            const receipt = await executeMintTransaction(
                walletClient,
                publicClient,
                position,
                mintOptions
            );
            console.log('\n✅ Position minted successfully!');
            console.log(`Transaction hash: ${receipt.transactionHash}`);
        }

    } catch (error) {
        console.error('❌ Error minting position:', error);
        throw error;
    }
}

// Run the script
main().catch(console.error); 