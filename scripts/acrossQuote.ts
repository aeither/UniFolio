import { createAcrossClient } from "@across-protocol/app-sdk";
import { base, optimism } from "viem/chains";
import { parseUnits } from "viem";
import { loadDevVars } from './utils/envLoader';

const env = loadDevVars();

// Create Across client
const client = createAcrossClient({
  integratorId: "0x1234", // Using a placeholder 2-byte hex integrator ID
  chains: [base, optimism],
});

// Configuration for Base to Optimism USDC bridge
const originChainId = base.id; // 8453
const destinationChainId = optimism.id; // 10
const inputToken = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC on Base
const outputToken = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"; // USDC on Optimism
const inputAmount = parseUnits("10", 6); // 10 USDC (6 decimals)
const walletAddress = "0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125";

async function getAcrossQuote() {
  try {
    console.log('🔄 Getting Across quote for bridging 10 USDC from Base to Optimism...');

    console.log("Quote Parameters:");
    console.log(`  - Origin Chain: Base (${originChainId})`);
    console.log(`  - Destination Chain: Optimism (${destinationChainId})`);
    console.log(`  - Input Token: ${inputToken} (USDC on Base)`);
    console.log(`  - Output Token: ${outputToken} (USDC on Optimism)`);
    console.log(`  - Amount: ${inputAmount.toString()} (10 USDC)`);
    console.log(`  - Wallet Address: ${walletAddress}`);

    // Get quote from Across
    const quote = await client.getQuote({
      route: {
        originChainId: originChainId,
        destinationChainId: destinationChainId,
        inputToken,
        outputToken,
      },
      inputAmount: inputAmount.toString(),
    });

    // Helper function to convert BigInt to string
    const bigIntToString = (value: any): any => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (Array.isArray(value)) {
        return value.map(bigIntToString);
      }
      if (value && typeof value === 'object') {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = bigIntToString(val);
        }
        return result;
      }
      return value;
    };

    // Extract key information from the quote and convert BigInts
    const quoteInfo = {
      depositInfo: {
        originChainId: quote.deposit.originChainId,
        destinationChainId: quote.deposit.destinationChainId,
        inputAmount: bigIntToString(quote.deposit.inputAmount),
        outputAmount: bigIntToString(quote.deposit.outputAmount),
        inputToken: quote.deposit.inputToken,
        outputToken: quote.deposit.outputToken,
        spokePoolAddress: quote.deposit.spokePoolAddress,
        destinationSpokePoolAddress: quote.deposit.destinationSpokePoolAddress,
        fillDeadline: bigIntToString(quote.deposit.fillDeadline),
        exclusivityDeadline: bigIntToString(quote.deposit.exclusivityDeadline),
      },
      estimatedFillTimeSec: quote.estimatedFillTimeSec,
      fees: {
        lpFee: {
          pct: bigIntToString(quote.fees.lpFee.pct),
          total: bigIntToString(quote.fees.lpFee.total),
        },
        relayerCapitalFee: {
          pct: bigIntToString(quote.fees.relayerCapitalFee.pct),
          total: bigIntToString(quote.fees.relayerCapitalFee.total),
        },
        relayerGasFee: {
          pct: bigIntToString(quote.fees.relayerGasFee.pct),
          total: bigIntToString(quote.fees.relayerGasFee.total),
        },
        totalRelayFee: {
          pct: bigIntToString(quote.fees.totalRelayFee.pct),
          total: bigIntToString(quote.fees.totalRelayFee.total),
        },
      },
      limits: bigIntToString(quote.limits),
      isAmountTooLow: quote.isAmountTooLow,
    };

    console.log("✅ Across Quote Generated:");
    console.log(`  - Output Amount: ${bigIntToString(quote.deposit.outputAmount)} USDC units`);
    console.log(`  - Estimated Fill Time: ${quote.estimatedFillTimeSec} seconds`);
    console.log(`  - Total Relay Fee: ${bigIntToString(quote.fees.totalRelayFee.total)} units`);
    console.log(`  - Is Amount Too Low: ${quote.isAmountTooLow}`);

    console.log("\n📊 Full Quote Details:");
    console.log(JSON.stringify(quoteInfo, null, 2));

    // COMMENTED OUT: Actual execution would happen here
    /*
    console.log("🔄 Would execute Across bridge here...");
    
    // For execution, you would use:
    await client.executeQuote({
      walletClient: wallet, // from wagmi useWalletClient()
      deposit: quote.deposit,
      onProgress: (progress) => {
        if (progress.step === "approve" && progress.status === "txSuccess") {
          console.log("✅ Approval successful:", progress.txReceipt);
        }
        if (progress.step === "deposit" && progress.status === "txSuccess") {
          console.log("✅ Deposit successful:", progress.depositId, progress.txReceipt);
        }
        if (progress.step === "fill" && progress.status === "txSuccess") {
          console.log("✅ Fill successful:", progress.fillTxTimestamp, progress.txReceipt);
        }
      },
    });
    */

    return quote;
  } catch (error) {
    console.error('❌ Error getting Across quote:', error);

    // Fallback mock quote if API fails
    console.log('⚠️ Across API failed, generating mock quote instead');

    const mockQuote = {
      depositInfo: {
        originChainId: originChainId,
        destinationChainId: destinationChainId,
        inputAmount: inputAmount.toString(),
        outputAmount: "9995000", // Slightly less due to fees
        inputToken: inputToken,
        outputToken: outputToken,
        spokePoolAddress: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
        destinationSpokePoolAddress: "0x6f26Bf09B1C792e3228e5467807a900A503c0281",
        fillDeadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        exclusivityDeadline: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
      },
      estimatedFillTimeSec: 60, // 1 minute
      fees: {
        lpFee: {
          pct: "50000000000000", // 0.005%
          total: "500", // 0.0005 USDC
        },
        relayerCapitalFee: {
          pct: "40000000000000", // 0.004%
          total: "400", // 0.0004 USDC
        },
        relayerGasFee: {
          pct: "40000000000000", // 0.004%
          total: "4100", // 0.0041 USDC
        },
        totalRelayFee: {
          pct: "130000000000000", // 0.013%
          total: "5000", // 0.005 USDC
        },
      },
      limits: {
        maxDeposit: "100000000000", // 100,000 USDC
        maxDepositInstant: "50000000000", // 50,000 USDC
        maxDepositShortDelay: "100000000000",
        minDeposit: "1000000", // 1 USDC
        recommendedDepositInstant: "10000000000", // 10,000 USDC
      },
      isAmountTooLow: false,
      error: (error as Error).message,
    };

    console.log("✅ Mock Across Quote Generated:");
    console.log(JSON.stringify(mockQuote, null, 2));

    return mockQuote;
  }
}

// Run the quote function
getAcrossQuote().catch(console.error);

export { getAcrossQuote };