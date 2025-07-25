/**
 * Remove 100% of the liquidity for a given NFT position on Uniswap v4
 * using viem instead of ethers.
 *
 * Compile & run:
 *  px tsx scripts/uniswap/remove-liquidity-viem.ts --tokenId=905572
 *
 * Required .env file:
 *   ETHEREUM_RPC_URL="https://your-unichain-rpc-url"
 *   ETHEREUM_PRIVATE_KEY="0xyour_private_key_here"
 */


import { createPublicClient, createWalletClient, http, defineChain } from 'viem'; // CHANGE 1: Import defineChain
import { encodeAbiParameters, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
// import { mainnet } from 'viem/chains'; // No longer needed
import { formatEther } from 'viem/utils';
import { loadEnv, validateEnv } from '../utils/envLoader';
import { unichain } from 'viem/chains';


/* ------------------------------------------------------------------ */
/* 1. Addresses & constants                                           */
/* ------------------------------------------------------------------ */


const POSITION_MANAGER = '0x4529a01c7a0410167c5740c487a8de60232617bf';
const AMOUNT0_MIN      = 0n;
const AMOUNT1_MIN      = 0n;
const DEADLINE_SECS    = 20n * 60n;

/* ------------------------------------------------------------------ */
/* 2. Minimal ABI fragments                                           */
/* ------------------------------------------------------------------ */


const posmAbi = [
  {
    name: 'getPositionLiquidity',
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'uint128' }],
  },
  {
    name: 'getPoolAndPositionInfo',
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hook', type: 'address' },
        ],
      },
      { name: 'mixed', type: 'uint256' },
    ],
  },
  {
    name: 'modifyLiquidities',
    stateMutability: 'payable',
    type: 'function',
    inputs: [
      { name: 'unlockData', type: 'bytes' },
      { name: 'deadline',   type: 'uint256' },
    ],
    outputs: [],
  },
] as const;


/* ------------------------------------------------------------------ */
/* 3. Helper – pack uint8 opcodes (viem encodePacked)                 */
/* ------------------------------------------------------------------ */


function packActions(...codes: number[]): `0x${string}` {
  // encodes an array of uint8 into packed bytes
  return encodePacked(
    Array(codes.length).fill('uint8') as ['uint8', ...'uint8'[]],
    codes as [number, ...number[]]
  );
}


/* ------------------------------------------------------------------ */
/* 4. Main logic                                                      */
/* ------------------------------------------------------------------ */


async function main() {
  /* 4.1 Validate environment and arguments */
  // Load environment variables
  const env = loadEnv();
  validateEnv(env as unknown as Record<string, string>, ['ETHEREUM_RPC_URL', 'ETHEREUM_PRIVATE_KEY']);


  const envVars = env as unknown as { ETHEREUM_RPC_URL: string; ETHEREUM_PRIVATE_KEY: string };


  const tokenIdArg = process.argv.find((a) => a.startsWith('--tokenId='));
  if (!tokenIdArg) {
    throw new Error(
      'Error: Missing command-line argument. Please run with --tokenId=<YOUR_TOKEN_ID>'
    );
  }
  const TOKEN_ID = BigInt(tokenIdArg.split('=')[1]);


  console.log(`Preparing to remove liquidity for token ID: ${TOKEN_ID}`);


  /* 4.2 Bootstrap clients & account */
  const transport = http(envVars.ETHEREUM_RPC_URL);
  // CHANGE 3: Use the custom 'unichain' object instead of 'mainnet'
  const publicClient = createPublicClient({ chain: unichain, transport });
  const account      = privateKeyToAccount(envVars.ETHEREUM_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: unichain, // CHANGE 4: Use the custom 'unichain' object here as well
    transport,
  });


  console.log(`Using account: ${account.address}`);


  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Account balance: ${formatEther(balance)} ETH`);


  /* 4.3 Fetch on-chain state */
  const liquidity: bigint = await publicClient.readContract({
    address: POSITION_MANAGER,
    abi: posmAbi,
    functionName: 'getPositionLiquidity',
    args: [TOKEN_ID],
  });


  if (liquidity === 0n) {
    throw new Error(
      `Position for token ${TOKEN_ID} has no liquidity or does not exist.`
    );
  }
  console.log(`Liquidity to burn: ${liquidity}`);


  const [poolKey] = (await publicClient.readContract({
    address: POSITION_MANAGER,
    abi: posmAbi,
    functionName: 'getPoolAndPositionInfo',
    args: [TOKEN_ID],
  })) as any;


  const currency0 = poolKey.currency0 as `0x${string}`;
  const currency1 = poolKey.currency1 as `0x${string}`;


  /* 4.4 Encode DECREASE_LIQUIDITY + TAKE_PAIR actions */
  const DECREASE_LIQUIDITY = 1;
  const TAKE_PAIR          = 17;
  const actions            = packActions(DECREASE_LIQUIDITY, TAKE_PAIR);


  const decParams = encodeAbiParameters(
    [
      { name: 'tokenId',  type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0Min', type: 'uint256' },
      { name: 'amount1Min', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    [TOKEN_ID, liquidity, AMOUNT0_MIN, AMOUNT1_MIN, '0x']
  );


  const takeParams = encodeAbiParameters(
    [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'recipient', type: 'address' },
    ],
    [currency0, currency1, account.address]
  );


  const unlockData = encodeAbiParameters(
    [
      { name: 'actions',     type: 'bytes' },
      { name: 'parameters',  type: 'bytes[]' },
    ],
    [actions, [decParams, takeParams]]
  );


  /* 4.5 Estimate gas & submit transaction */
  const deadline = BigInt(Math.floor(Date.now() / 1_000)) + DEADLINE_SECS;


  // Estimate gas directly for more accuracy, removing the need for a fallback
  console.log('Estimating gas for the transaction...');
  const gasEstimate = await publicClient.estimateContractGas({
    address: POSITION_MANAGER,
    abi: posmAbi,
    functionName: 'modifyLiquidities',
    args: [unlockData, deadline],
    account,
  });


  // Add a 20% safety margin to the estimate to account for network fluctuations
  const gasLimit = (gasEstimate * 120n) / 100n;


  console.log(`Gas estimate: ${gasEstimate}`);
  console.log(`Using gas limit (with 20% safety margin): ${gasLimit}`);


  // Optional balance check
  const gasPrice = await publicClient.getGasPrice();
  const txCost   = gasLimit * gasPrice;
  if (balance < txCost) {
    throw new Error(
      `Insufficient balance. Need ${formatEther(txCost)} ETH but only have ${formatEther(balance)} ETH`
    );
  }
  console.log(`Estimated transaction cost: ${formatEther(txCost)} ETH`);


  // Send tx
  console.log('Submitting transaction to remove liquidity...');
  const hash = await walletClient.writeContract({
    address: POSITION_MANAGER,
    abi: posmAbi,
    functionName: 'modifyLiquidities',
    args: [unlockData, deadline],
    gas: gasLimit, // Use the calculated gas limit
  });
  console.log('Tx sent successfully →', hash);


  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('✅ Removal confirmed in block:', receipt.blockNumber);
}


main().catch((err) => {
  if (err instanceof Error && err.message.startsWith('Error:')) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});

