# 🌉 UniFolio - Cross-Chain Bridge Aggregator & Executor

> **One-liner**: Aggregate real-time quotes from 4+ bridge protocols and execute trades directly in Telegram

**Brief description**: UniFolio is a Telegram bot that solves cross-chain bridge fragmentation by aggregating quotes from multiple protocols simultaneously AND executing trades directly. Users can compare rates, gas fees, and bridge loss across LiFi, Hyperlane, Squid, and Stargate with a simple command like `bridge 1 usdc from base to mantle`, then execute the best route with one click. Perfect for DeFi users, traders, and anyone needing to transfer tokens between blockchains efficiently. Features intelligent ranking, interactive buttons, real-time quote updates, and **actual bridge execution** with transaction tracking.

---

A sophisticated Telegram bot that aggregates and compares real-time quotes from multiple cross-chain bridge protocols, helping users find the most cost-effective routes for token transfers across different blockchains.

## 🎯 Key Pain Point & Solution

### **The Problem: Bridge Fragmentation**
Users face a fragmented cross-chain bridge ecosystem with:
- **Multiple protocols** (LiFi, Hyperlane, Squid, Stargate, Across) each with different rates
- **Manual comparison** required across multiple websites/apps
- **Hidden fees** and complex gas calculations
- **No unified interface** for quick decision making
- **Time-sensitive quotes** that expire quickly

### **Our Solution: Intelligent Quote Aggregation + Execution**
UniFolio solves this by providing:
- **One-command comparison**: `bridge 1 usdc from base to mantle`
- **Real-time aggregation** from 4+ bridge protocols simultaneously
- **Smart ranking algorithm** that considers output amount, gas fees, and bridge loss (60%/30%/10% weighted)
- **Actual bridge execution** with transaction tracking and receipts
- **Interactive execution** with one-click bridge initiation
- **Telegram-native interface** for seamless mobile experience

## 🌉 Bridge Protocol Integrations

### **Implemented Providers**

| Provider | Status | Features | Execution | Supported Routes |
|----------|--------|----------|-----------|------------------|
| **LiFi** | ✅ Live | Real SDK quotes, fee calculation | Quote only | Base ↔ Mantle, Arbitrum |
| **Hyperlane** | ✅ Live | Warp route quotes, gas estimation | Quote only | Base ↔ Arbitrum |
| **Squid** | ✅ Live | Direct API quotes, fee breakdown | Quote only | Base ↔ Mantle |
| **Stargate** | ✅ Live | LayerZero quotes + **Full Execution** | ✅ **Execute** | Base ↔ Mantle/Arbitrum |
| **Across** | 🔄 Planned | Intent-based bridging | TBD | TBD |

### **Execution Capabilities**
- **Stargate**: Full execution with real transactions, approve + bridge steps, transaction receipts
- **Other providers**: Quote comparison only (execution coming soon)

### **Supported Networks & Tokens**
- **Base (8453)**: USDC, ETH
- **Arbitrum (42161)**: USDC, ETH  
- **Mantle (5000)**: USDC, ETH
- **Ethereum (1)**: USDC, ETH *(coming soon)*

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT INTERFACE                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Natural Lang   │  │  Interactive    │  │   Quote Display │  │
│  │   Commands       │  │   Buttons       │  │   & Rankings    │  │
│  │   "bridge 10..." │  │   [⭐ LIFI]      │  │   📊 Results    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Bot Handler   │  │  Quote Router   │  │  Response       │  │
│  │   (GrammY)      │  │  & Aggregator   │  │  Formatter      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BRIDGE PROTOCOL LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    LIFI     │  │  HYPERLANE  │  │    SQUID    │  │STARGATE │ │
│  │  SDK v3.8   │  │  SDK v15.0  │  │  SDK v2.10  │  │  API    │ │
│  │ Real-time   │  │ Warp Routes │  │ Cross-chain │  │Omnichain│ │
│  │ Aggregator  │  │  Protocol   │  │  Router     │  │Protocol │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN NETWORKS                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │    BASE     │  │  ARBITRUM   │  │   MANTLE    │  │ETHEREUM │ │
│  │  Layer 2    │  │  Layer 2    │  │  Layer 2    │  │  L1     │ │
│  │  USDC/ETH   │  │  USDC/ETH   │  │  USDC/ETH   │  │USDC/ETH │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Core Features

### **1. Natural Language Commands**
```bash
bridge 1 usdc from base to mantle
bridge 0.5 eth from ethereum to arbitrum
bridge 100 usdc from arbitrum to base
```

### **2. Real-Time Quote Aggregation**
- **LiFi**: Cross-chain bridge aggregator with 15+ protocols
- **Hyperlane**: Warp routes for seamless cross-chain transfers
- **Squid**: Cross-chain liquidity router with deep liquidity
- **Stargate**: Omnichain protocol with native asset bridging

### **3. Intelligent Ranking System**
```typescript
// Weighted scoring algorithm
const score = (
  outputAmount * 0.70 +    // 70% weight on output amount
  gasFees * 0.20 +         // 20% weight on gas costs
  bridgeLoss * 0.10        // 10% weight on bridge loss
);
```

### **4. Interactive Telegram Interface**
- **One-click execution** buttons for each provider
- **Best provider highlighting** with ⭐ star
- **Real-time quote refresh** functionality
- **Beautiful formatting** with emojis and clear metrics

### **Bridge Execution** 🆕
- **One-click execution** directly from quote comparison
- **Real transaction processing** with Viem integration  
- **Multi-step handling** (approve + bridge transactions)
- **Transaction receipts** with block confirmation
- **Error handling** with detailed user feedback
- **Currently supported**: Stargate (other providers coming soon)

## 📊 Supported Networks & Tokens

| Network | Chain ID | Supported Tokens | Status |
|---------|----------|------------------|---------|
| **Base** | 8453 | USDC, ETH | ✅ Active |
| **Arbitrum** | 42161 | USDC, ETH | ✅ Active |
| **Mantle** | 5000 | USDC, ETH | ✅ Active |
| **Ethereum** | 1 | USDC, ETH | ✅ Active |
| **Polygon** | 137 | USDC, ETH | 🔄 Coming Soon |
| **Optimism** | 10 | USDC, ETH | 🔄 Coming Soon |

## 🛠️ Technical Stack

### **Backend Infrastructure**
- **Cloudflare Workers**: Serverless edge computing
- **GrammY**: Modern Telegram Bot API framework
- **TypeScript**: Full type safety and IntelliSense
- **Node.js Compatibility**: `nodejs_compat` flag for SDK support

### **Bridge Protocol SDKs**
- **@lifi/sdk**: v3.8 - Cross-chain bridge aggregator
- **@hyperlane-xyz/sdk**: v15.0 - Warp routes protocol
- **@0xsquid/sdk**: v2.10 - Cross-chain liquidity router
- **Stargate API**: Omnichain protocol integration

### **Development Tools**
- **Wrangler**: Cloudflare Workers CLI
- **pnpm**: Fast, disk space efficient package manager
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking

## 🏃‍♂️ Quick Start

### **1. Prerequisites**
```bash
node >= 18.0.0
pnpm >= 8.0.0
Cloudflare account
Telegram Bot Token (from @BotFather)
```

### **2. Installation**
```bash
git clone <your-repo-url>
cd UniFolio
pnpm install
```

### **3. Environment Setup**
Create `.dev.vars` file:
```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
TG_CHAT_ID=your_chat_id_here
MINI_APP_URL=https://your-production-mini-app-url.com

# RPC URLs for Bridge Protocols
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
MANTLE_RPC_URL=https://mantle-mainnet.g.alchemy.com/v2/YOUR_KEY

# Bridge Provider Configuration
INTEGRATOR_ID=your_squid_integrator_id

# Wallet Configuration (for bridge execution)
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### **4. Local Development**
```bash
# Start development server
pnpm run dev:webhook

# Expose via ngrok (optional)
pnpm run dev:ngrok
```

### **5. Deploy to Production**
```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Set bot token as secret
pnpm run secret

# Register bot commands
pnpm run commands:setup
```

## 📁 Project Structure

```
UniFolio/
├── src/
│   ├── lib/
│   │   ├── quotes/           # Bridge protocol integrations
│   │   │   ├── lifi.ts       # LiFi SDK integration
│   │   │   ├── hyperlane.ts  # Hyperlane Warp routes
│   │   │   ├── squid.ts      # Squid router integration
│   │   │   └── stargate.ts   # Stargate API integration
│   │   ├── bridgeUtils.ts    # Command parsing & validation
│   │   ├── quoteAggregator.ts # Quote collection & ranking
│   │   └── telegramFormatter.ts # Response formatting
│   ├── bot.ts               # Telegram bot commands
│   ├── worker.ts            # Cloudflare Worker entry point
│   └── env.ts               # Environment type definitions
├── scripts/
│   ├── lifiQuote.ts         # LiFi quote testing
│   ├── hyperlaneQuote.ts    # Hyperlane quote testing
│   ├── squidQuote.ts        # Squid quote testing
│   ├── stargateQuote.ts     # Stargate quote testing
│   ├── compareBridges.ts    # Bridge comparison testing
│   └── utils/
│       └── envLoader.ts     # Environment variable loader
├── wrangler.toml            # Cloudflare Workers configuration
└── package.json             # Dependencies and scripts
```

## 🤖 Bot Commands

### **Bridge Comparison & Execution**
```bash
bridge 1 usdc from base to mantle
```
**Response:**
```
🌉 Bridge Quotes: 1 USDC
📤 From: BASE
📥 To: MANTLE

⭐ 🌉 STARGATE
💰 Output: 0.995 USDC
⏱️ Time: 120s
💸 Gas: $0.05
📉 Loss: 0.50%

2️⃣ 🦑 SQUID
💰 Output: 0.993 USDC
⏱️ Time: 300s
💸 Gas: $0.08
📉 Loss: 0.70%

[🚀 Execute Stargate] [Squid Quote] [🔄 Refresh]
```

**After clicking "Execute Stargate":**
```
✅ Stargate Bridge Successful!

💰 Amount: 1 USDC
🔗 From: base → mantle
📝 Transaction: 0x1234...5678
🎉 Your tokens have been bridged!
```

### **Individual Provider Quotes**
```bash
/lifi      # Get LiFi quote
/hyperlane # Get Hyperlane quote
/squid     # Get Squid quote
/stargate  # Get Stargate quote
```

### **Utility Commands**
```bash
/start     # Welcome message with mini app
/help      # Show available commands
/ping      # Test bot responsiveness
```

## 🔧 Advanced Configuration

### **Adding New Bridge Protocols**
1. **Create quote integration** in `src/lib/quotes/`
2. **Implement standardized interface**:
   ```typescript
   interface BridgeQuote {
     provider: string;
     destAmountFormatted: string;
     duration: number;
     gasFeeUSD: string;
     bridgeLoss: string;
     bridgeLossPercentage: string;
   }
   ```
3. **Add to aggregator** in `src/lib/quoteAggregator.ts`
4. **Update command parser** in `src/lib/bridgeUtils.ts`

### **Customizing Ranking Algorithm**
Modify weights in `src/lib/quoteAggregator.ts`:
```typescript
const weights = {
  outputAmount: 0.70,    // Prioritize highest output
  gasFees: 0.20,         // Consider gas costs
  bridgeLoss: 0.10       // Minimize bridge loss
};
```

### **Environment Variables**
| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram bot token | ✅ |
| `BASE_RPC_URL` | Base network RPC | ✅ |
| `ARBITRUM_RPC_URL` | Arbitrum network RPC | ✅ |
| `MANTLE_RPC_URL` | Mantle network RPC | ✅ |
| `INTEGRATOR_ID` | Squid integrator ID | 🔄 |
| `MINI_APP_URL` | Mini app URL | 🔄 |

## 🧪 Testing

### **Individual Bridge Testing**
```bash
# Test LiFi quotes
npx tsx scripts/lifiQuote.ts

# Test Hyperlane quotes
npx tsx scripts/hyperlaneQuote.ts

# Test Squid quotes
npx tsx scripts/squidQuote.ts

# Test Stargate quotes
npx tsx scripts/stargateQuote.ts
```

### **Bridge Comparison Testing**
```bash
# Compare all bridges
npx tsx scripts/compareBridges.ts
```

### **Bot Testing**
```bash
# Start development server
pnpm run dev:webhook

# Test commands in Telegram
bridge 10 usdc from base to mantle
/lifi
/hyperlane
```

## 🔒 Security & Best Practices

### **Security Features**
- **Environment-based secrets** stored in Cloudflare Workers
- **No sensitive data** in code or repositories
- **Rate limiting** on quote requests
- **Input validation** for all user commands
- **Error handling** with graceful fallbacks

### **Execution Security**
- **Private key management** through environment variables only
- **Transaction verification** with receipt confirmations
- **Error handling** to prevent transaction failures
- **⚠️ WARNING**: Only use test wallets with minimal funds for bridge execution

### **Development Best Practices**
- **TypeScript** for type safety
- **Modular architecture** for easy maintenance
- **Comprehensive error handling**
- **Real-time logging** for debugging
- **Standardized interfaces** across providers

## 📈 Performance & Scalability

### **Performance Optimizations**
- **Parallel quote fetching** using `Promise.allSettled()`
- **Edge computing** with Cloudflare Workers
- **Caching** of frequently requested quotes
- **Lazy loading** of bridge SDKs

### **Scalability Features**
- **Serverless architecture** auto-scales with demand
- **Global edge network** for low latency
- **Modular design** for easy protocol additions
- **Stateless operations** for horizontal scaling

## 🚀 Roadmap

### **Phase 1: Core Features** ✅
- [x] Multi-protocol quote aggregation
- [x] Natural language command parsing
- [x] Intelligent ranking algorithm
- [x] Interactive Telegram interface
- [x] Cloudflare Workers deployment
- [x] **Transaction execution (Stargate)**

### **Phase 2: Enhanced Features** 🔄
- [x] **Stargate execution capabilities**
- [ ] Multi-provider execution
- [ ] Portfolio tracking and analytics
- [ ] Price alerts and notifications
- [ ] Advanced routing algorithms
- [ ] Mobile app integration

### **Phase 3: Advanced Features** 📋
- [ ] Cross-chain DeFi integration
- [ ] MEV protection and optimization
- [ ] Institutional features
- [ ] API for third-party integrations
- [ ] Advanced analytics dashboard

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### **Code Style**
- Use TypeScript for all new code
- Follow existing code patterns
- Add comprehensive error handling
- Include JSDoc comments for public APIs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LiFi Team** for the excellent cross-chain SDK
- **Hyperlane Team** for the Warp routes protocol
- **Squid Team** for the cross-chain router
- **Stargate Team** for the omnichain protocol
- **Cloudflare** for the amazing Workers platform
- **GrammY** for the modern Telegram bot framework

---

**Built with ❤️ for the cross-chain ecosystem**

*UniFolio - Making cross-chain bridging simple, fast, and cost-effective.*
