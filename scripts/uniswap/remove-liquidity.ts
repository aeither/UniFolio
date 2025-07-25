/**
 * Remove 100% of the liquidity for a given NFT position on Uniswap v4.
 *
 * This script now reads the Token ID from a command-line argument.
 *
 * Compile & run:
 *   npx tsx scripts/uniswap/remove-liquidity.ts --tokenId=672628
 *
 * Required .env file:
 *   ETHEREUM_RPC_URL="https://your-unichain-rpc-url"
 *   ETHEREUM_PRIVATE_KEY="0xyour_private_key_here"
 */

import { ethers } from 'ethers';
import { loadEnv, validateEnv } from '../utils/envLoader';

/* ------------------------------------------------------------------ */
/* 1. Addresses & constants                                           */
/* ------------------------------------------------------------------ */

const POSITION_MANAGER = '0x4529a01c7a0410167c5740c487a8de60232617bf';
const AMOUNT0_MIN      = 0;
const AMOUNT1_MIN      = 0;
const DEADLINE_SECS    = 20 * 60;

/* ------------------------------------------------------------------ */
/* 2. Minimal ABI fragments                                           */
/* ------------------------------------------------------------------ */

const posmAbi = [
  'function getPositionLiquidity(uint256) view returns (uint128)',
  'function getPoolAndPositionInfo(uint256) view returns (tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hook),uint256)',
  'function modifyLiquidities(bytes unlockData,uint256 deadline) payable',
];

/* ------------------------------------------------------------------ */
/* 3. Helper – pack uint8 opcodes (v5 utils.solidityPack)             */
/* ------------------------------------------------------------------ */

function packActions(...codes: number[]): string {
  const types = new Array(codes.length).fill('uint8');
  return ethers.utils.solidityPack(types, codes);
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

  const tokenIdArg = process.argv.find(arg => arg.startsWith('--tokenId='));
  if (!tokenIdArg) {
    throw new Error('Error: Missing command-line argument. Please run with --tokenId=<YOUR_TOKEN_ID>');
  }
  const TOKEN_ID = parseInt(tokenIdArg.split('=')[1], 10);
  if (isNaN(TOKEN_ID)) {
    throw new Error(`Error: Invalid TOKEN_ID provided: ${tokenIdArg}`);
  }

  console.log(`Preparing to remove liquidity for token ID: ${TOKEN_ID}`);

  /* 4.2 Bootstrap provider, signer, and contract (v5 syntax) */
  const provider = new ethers.providers.JsonRpcProvider(envVars.ETHEREUM_RPC_URL);
  const signer   = new ethers.Wallet(envVars.ETHEREUM_PRIVATE_KEY, provider);
  const posm     = new ethers.Contract(POSITION_MANAGER, posmAbi, signer);
  
  console.log(`Using account: ${signer.address}`);

  // Check account balance
  const accountBalance = await provider.getBalance(signer.address);
  console.log(`Account balance: ${ethers.utils.formatEther(accountBalance)} ETH`);

  /* 4.3 Fetch on-chain state */
  const liquidity = await posm.getPositionLiquidity(TOKEN_ID); // BigNumber in v5
  if (liquidity.isZero()) {
    throw new Error(`Position for token ${TOKEN_ID} has no liquidity or does not exist.`);
  }
  console.log(`Liquidity to burn: ${liquidity.toString()}`);

  const [poolKey] = await posm.getPoolAndPositionInfo(TOKEN_ID);
  const currency0 = poolKey.currency0 as string;
  const currency1 = poolKey.currency1 as string;

  /* 4.4 Encode DECREASE_LIQUIDITY + TAKE_PAIR actions */
  const DECREASE_LIQUIDITY = 1;
  const TAKE_PAIR          = 17;
  const actions = packActions(DECREASE_LIQUIDITY, TAKE_PAIR);

  const decParams  = ethers.utils.defaultAbiCoder.encode(
    ['uint256','uint128','uint256','uint256','bytes'], // Matched types to function signature
    [TOKEN_ID, liquidity, AMOUNT0_MIN, AMOUNT1_MIN, '0x']
  );

  const takeParams = ethers.utils.defaultAbiCoder.encode(
    ['address','address','address'],
    [currency0, currency1, await signer.getAddress()]
  );

  const unlockData = ethers.utils.defaultAbiCoder.encode(
    ['bytes','bytes[]'],
    [actions, [decParams, takeParams]]
  );

  /* 4.5 Submit transaction */
  const deadline = Math.floor(Date.now() / 1_000) + DEADLINE_SECS;
  
  // Estimate gas first
  let gasEstimate;
  try {
    gasEstimate = await posm.estimateGas.modifyLiquidities(unlockData, deadline);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
  } catch (error) {
    console.log('Gas estimation failed, using default gas limit of 500,000');
    gasEstimate = ethers.BigNumber.from(500_000);
  }

  // Add 20% buffer to gas estimate
  const gasLimit = gasEstimate.mul(120).div(100);
  console.log(`Using gas limit: ${gasLimit.toString()}`);

  // Check if we have enough balance for the transaction
  const gasPrice = await provider.getGasPrice();
  const estimatedCost = gasLimit.mul(gasPrice);
  const currentBalance = await provider.getBalance(signer.address);
  
  console.log(`Estimated transaction cost: ${ethers.utils.formatEther(estimatedCost)} ETH`);
  
  if (currentBalance.lt(estimatedCost)) {
    throw new Error(`Insufficient balance. Need ${ethers.utils.formatEther(estimatedCost)} ETH but only have ${ethers.utils.formatEther(currentBalance)} ETH`);
  }

  console.log('Submitting transaction to remove liquidity...');
  const tx = await posm.modifyLiquidities(unlockData, deadline, {
    gasLimit: gasLimit
  });
  console.log('Tx sent successfully →', tx.hash);

  const receipt = await tx.wait();
  console.log('✅ Removal confirmed in block:', receipt.blockNumber);
}

main().catch(err => {
  // We check for the custom error message to provide a cleaner output.
  if (err instanceof Error && err.message.startsWith('Error:')) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
