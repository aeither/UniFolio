import { ChainId, Token } from '@uniswap/sdk-core';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';
import { Actions, type SwapExactInSingle, V4Planner } from '@uniswap/v4-sdk';
import {
    createPublicClient,
    createWalletClient,
    formatUnits,
    http,
    maxUint256,
    parseAbi,
    parseUnits,
    zeroAddress
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadEnv, validateEnv } from '../utils/envLoader';

// You'll need to define your custom chain for Unichain
// Since viem doesn't have Unichain built-in, you'll need to create a custom chain object
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
            http: [''], // You'll need to add your RPC URL here
        },
        public: {
            http: [''], // You'll need to add your RPC URL here
        },
    },
};

// Contract addresses for Unichain
const CHAIN_ID = ChainId.UNICHAIN;
const QUOTER_CONTRACT_ADDRESS = '0x333e3c607b141b18ff6de9f258db6e77fe7491e0';
const UNIVERSAL_ROUTER_ADDRESS = '0xef740bf23acae26f6492b10de645d6b98dc8eaf3';
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// Token definitions - Replace with Unichain tokens
const ETH_TOKEN = new Token(
    CHAIN_ID,
    zeroAddress, // viem's zero address constant
    18,
    'ETH',
    'Ether'
);

const USDC_TOKEN = new Token(
    CHAIN_ID,
    '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    6,
    'USDC',
    'USDC'
);

// Swap configuration - Fixed for V4 ABI structure
const CurrentConfig: SwapExactInSingle = {
    poolKey: {
        currency0: ETH_TOKEN.address < USDC_TOKEN.address ? ETH_TOKEN.address : USDC_TOKEN.address,
        currency1: ETH_TOKEN.address < USDC_TOKEN.address ? USDC_TOKEN.address : ETH_TOKEN.address,
        fee: 500, // 0.05% fee tier
        tickSpacing: 10,
        hooks: zeroAddress, // viem's zero address
    },
    zeroForOne: ETH_TOKEN.address < USDC_TOKEN.address,
    amountIn: parseUnits('0.0001', ETH_TOKEN.decimals).toString(),
    amountOutMinimum: '0',
    hookData: '0x00'
};

// Updated Quoter ABI for V4 - matches the actual contract structure
const QUOTER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            { "internalType": "Currency", "name": "currency0", "type": "address" },
                            { "internalType": "Currency", "name": "currency1", "type": "address" },
                            { "internalType": "uint24", "name": "fee", "type": "uint24" },
                            { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                            { "internalType": "contract IHooks", "name": "hooks", "type": "address" }
                        ],
                        "internalType": "struct PoolKey",
                        "name": "poolKey",
                        "type": "tuple"
                    },
                    { "internalType": "bool", "name": "zeroForOne", "type": "bool" },
                    { "internalType": "uint128", "name": "exactAmount", "type": "uint128" },
                    { "internalType": "bytes", "name": "hookData", "type": "bytes" }
                ],
                "internalType": "struct IV4Quoter.QuoteExactSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
            { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

// Universal Router ABI snippet
const UNIVERSAL_ROUTER_ABI = [
    {
        inputs: [
            { internalType: "bytes", name: "commands", type: "bytes" },
            { internalType: "bytes[]", name: "inputs", type: "bytes[]" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        name: "execute",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const;

// Permit2 ABI snippet (for approvals)
const PERMIT2_ABI = parseAbi([
    'function approve(address token, address spender, uint160 amount, uint48 expiration)'
]);

// ERC20 ABI snippet for approvals
const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)'
]);

async function main() {
    // Load environment variables
    const env = loadEnv();
    validateEnv(env as unknown as Record<string, string>, ['ETHEREUM_RPC_URL', 'ETHEREUM_PRIVATE_KEY']);

    const envVars = env as unknown as { ETHEREUM_RPC_URL: string; ETHEREUM_PRIVATE_KEY: string };

    // Set up clients
    const publicClient = createPublicClient({
        chain: unichain, // Use your custom chain
        transport: http(envVars.ETHEREUM_RPC_URL)
    });

    const account = privateKeyToAccount(envVars.ETHEREUM_PRIVATE_KEY as `0x${string}`);

    const walletClient = createWalletClient({
        account,
        chain: unichain,
        transport: http(envVars.ETHEREUM_RPC_URL)
    });

    console.log('Step 1: Clients set up.');

    // Step 1: Get quote
    console.log('Step 2: Getting quote...');

    let _amountOutMinimum: string;

    try {
        const quoteParams = {
            poolKey: CurrentConfig.poolKey,
            zeroForOne: CurrentConfig.zeroForOne,
            exactAmount: CurrentConfig.amountIn,
            hookData: CurrentConfig.hookData,
        };

        const quotedAmountOut = await publicClient.readContract({
            address: QUOTER_CONTRACT_ADDRESS as `0x${string}`,
            abi: QUOTER_ABI,
            functionName: 'quoteExactInputSingle',
            args: [quoteParams]
        });

        const formattedQuote = formatUnits(quotedAmountOut[0], USDC_TOKEN.decimals);
        console.log(`Step 3: Quoted output: ${formattedQuote} USDC for ${formatUnits(BigInt(CurrentConfig.amountIn), ETH_TOKEN.decimals)} ETH`);

        // Update minimum output based on quote (e.g., 1% slippage)
        _amountOutMinimum = ((quotedAmountOut[0] * 99n) / 100n).toString();
    } catch (error) {
        console.error('Error getting quote:', error);
        return;
    }

    // Step 2: Handle approvals (for ERC20 input; skip if native ETH)
    if (CurrentConfig.poolKey.currency0 !== zeroAddress) {
        // Approve Permit2
        const approveTx = await walletClient.writeContract({
            address: CurrentConfig.poolKey.currency0 as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [PERMIT2_ADDRESS, maxUint256],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        console.log('Step 4: Approved Permit2 for ERC20.');

        // Approve Universal Router via Permit2
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const permit2ApproveTx = await walletClient.writeContract({
            address: PERMIT2_ADDRESS as `0x${string}`,
            abi: PERMIT2_ABI,
            functionName: 'approve',
            args: [
                CurrentConfig.poolKey.currency0 as `0x${string}`,
                UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
                (2n ** 160n) - 1n, // Max uint160
                deadline
            ],
        });

        await publicClient.waitForTransactionReceipt({ hash: permit2ApproveTx });
        console.log('Step 5: Approved Universal Router via Permit2.');
    }

    console.log('Step 6: Setting up Universal Router.');

    // Plan actions
    const v4Planner = new V4Planner();
    v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [CurrentConfig]);
    v4Planner.addAction(Actions.SETTLE_ALL, [CurrentConfig.poolKey.currency0, CurrentConfig.amountIn]);
    v4Planner.addAction(Actions.TAKE_ALL, [CurrentConfig.poolKey.currency1, _amountOutMinimum]);

    const encodedActions = v4Planner.finalize();

    const routePlanner = new RoutePlanner();
    routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params]);

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Execute swap
    try {
        const txHash = await walletClient.writeContract({
            address: UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
            abi: UNIVERSAL_ROUTER_ABI,
            functionName: 'execute',
            args: [
                routePlanner.commands as `0x${string}`,
                [encodedActions as `0x${string}`],
                BigInt(deadline)
            ],
            value: CurrentConfig.poolKey.currency0 === zeroAddress ? BigInt(CurrentConfig.amountIn) : undefined
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`Step 7: Swap completed! Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error('Error executing swap:', error);
    }
}

main().catch(console.error);