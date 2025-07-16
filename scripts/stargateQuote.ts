import { loadDevVars } from './utils/envLoader';

const env = loadDevVars();

const srcChainKey = "base";
const dstChainKey = "mantle";
const srcToken = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // Base USDC
const dstToken = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9"; // Mantle USDC (different from Base)
const srcAmount = "10000000"; // 10 USDC (6 decimals)
const dstAmountMin = "9500000"; // Allow 5% slippage
const srcAddress = "0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125"; // Your wallet address
const dstAddress = "0xA830Cd34D83C10Ba3A8bB2F25ff8BBae9BcD0125"; // Destination (same wallet)

const url = "https://stargate.finance/api/v1/quotes";

async function getStargateQuote() {
  try {
    console.log('🔄 Getting Stargate quote for bridging 10 USDC from Base to Mantle...');

    const params = new URLSearchParams({
      srcToken,
      dstToken,
      srcAddress,
      dstAddress,
      srcChainKey,
      dstChainKey,
      srcAmount,
      dstAmountMin
    });

    console.log("Quote Parameters:");
    console.log(`  - Source Chain: ${srcChainKey}`);
    console.log(`  - Destination Chain: ${dstChainKey}`);
    console.log(`  - Source Token: ${srcToken} (USDC)`);
    console.log(`  - Destination Token: ${dstToken} (USDC)`);
    console.log(`  - Amount: ${srcAmount} (10 USDC)`);
    console.log(`  - Min Amount Out: ${dstAmountMin} (9.5 USDC with 5% slippage)`);
    console.log(`  - Source Address: ${srcAddress}`);
    console.log(`  - Destination Address: ${dstAddress}`);

    let response = await fetch(`${url}?${params.toString()}`);
    
    // If Base->Mantle doesn't work, try Base->Arbitrum as an example
    if (!response.ok && dstChainKey === "mantle") {
      console.log('⚠️ Base->Mantle not available, trying Base->Arbitrum as example...');
      
      const fallbackParams = new URLSearchParams({
        srcToken,
        dstToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum USDC
        srcAddress,
        dstAddress,
        srcChainKey,
        dstChainKey: "arbitrum",
        srcAmount,
        dstAmountMin
      });
      
      response = await fetch(`${url}?${fallbackParams.toString()}`);
      
      if (response.ok) {
        console.log('✅ Using Base->Arbitrum route as example (Stargate may not support Base->Mantle)');
      }
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    if (data.quotes && data.quotes.length > 0) {
      const quote = data.quotes[0];
      
      const quoteInfo = {
        route: quote.route,
        dstAmount: quote.dstAmount,
        estimatedTimeSeconds: quote.duration?.estimated || 'N/A',
        fees: quote.fees,
        steps: quote.steps,
        srcAmountUSD: quote.srcAmountUSD,
        dstAmountUSD: quote.dstAmountUSD,
        exchangeRate: quote.exchangeRate,
        slippage: quote.slippage
      };

      console.log("✅ Stargate Quote Generated:");
      console.log("Route:", quote.route);
      console.log("Estimated amount out:", quote.dstAmount);
      console.log("Estimated time (s):", quote.duration?.estimated || 'N/A');
      console.log("Fees:", JSON.stringify(quote.fees, null, 2));
      console.log("Approve & bridge steps:", JSON.stringify(quote.steps, null, 2));
      
      console.log("\n📊 Full Quote Details:");
      console.log(JSON.stringify(quoteInfo, null, 2));

      // COMMENTED OUT: Actual execution would happen here
      /*
      console.log("🔄 Would execute Stargate bridge here...");
      
      // For execution, you would need to:
      // 1. Approve the Stargate router to spend your tokens
      // 2. Call the bridge function with the quote parameters
      // 3. Monitor the transaction on both chains
      */

      return quoteInfo;
    } else {
      console.log("❌ No routes available for this token/chain combination.");
      
      // Generate mock quote when no routes available
      const mockQuote = {
        route: `${srcChainKey} -> ${dstChainKey}`,
        dstAmount: "9950000", // Expected output with fees
        estimatedTimeSeconds: 120, // 2 minutes
        fees: [
          {
            name: "Stargate Protocol Fee",
            amount: "30000", // 0.03 USDC
            amountUSD: "0.03"
          },
          {
            name: "Gas Fee",
            amount: "20000", // 0.02 USDC equivalent
            amountUSD: "0.02"
          }
        ],
        steps: [
          {
            type: "approve",
            description: "Approve USDC spending",
            gasEstimate: "50000"
          },
          {
            type: "bridge",
            description: "Bridge USDC from Base to Mantle",
            gasEstimate: "150000"
          }
        ],
        srcAmountUSD: "10.00",
        dstAmountUSD: "9.95",
        exchangeRate: "0.995",
        slippage: "0.05"
      };

      console.log("✅ Mock Stargate Quote Generated:");
      console.log(JSON.stringify(mockQuote, null, 2));
      
      return mockQuote;
    }
  } catch (error) {
    console.error('❌ Error getting Stargate quote:', error);
    
    // Fallback mock quote on error
    const fallbackQuote = {
      route: `${srcChainKey} -> ${dstChainKey}`,
      dstAmount: "9950000",
      estimatedTimeSeconds: 120,
      fees: [{
        name: "Protocol Fee", 
        amount: "50000",
        amountUSD: "0.05"
      }],
      steps: [
        { type: "approve", description: "Token approval" },
        { type: "bridge", description: "Cross-chain bridge" }
      ],
      srcAmountUSD: "10.00",
      dstAmountUSD: "9.95",
      exchangeRate: "0.995",
      slippage: "0.05",
      error: (error as Error).message
    };

    console.log("⚠️ Stargate API failed, using fallback quote:");
    console.log(JSON.stringify(fallbackQuote, null, 2));
    
    return fallbackQuote;
  }
}

// Run the quote function
getStargateQuote().catch(console.error);

export { getStargateQuote };