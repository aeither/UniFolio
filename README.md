# Cross-Chain Bridge Quote Aggregator Bot

A Telegram bot that aggregates and compares quotes from multiple cross-chain bridge protocols to find the best rates for token transfers between different blockchains.

## 🌉 Supported Bridge Protocols

- **LiFi** - Cross-chain bridge aggregator
- **Across** - Fast, secure cross-chain intents
- **Stargate** - Omnichain liquidity transport protocol
- **Hyperlane** - Interoperability protocol (WIP)
- **Squid** - Cross-chain liquidity router (WIP)

## 🚀 Features

- **Real-time Quote Comparison**: Get quotes from multiple bridges simultaneously
- **Best Rate Selection**: Automatically finds the most cost-effective bridge for your transfer
- **Telegram Integration**: Easy-to-use bot interface within Telegram
- **Multi-Chain Support**: Supports transfers between major EVM chains
- **Execution Tracking**: Monitor transaction status and get explorer links
- **Interactive Buttons**: Execute transfers directly from Telegram

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))
- RPC endpoints for supported chains

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd UniFolio
pnpm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
BOT_TOKEN=your_telegram_bot_token_here
TG_CHAT_ID=your_chat_id_here
MINI_APP_URL=https://your-production-mini-app-url.com
```

### 3. Local Development

```bash
# Start local development server
pnpm run dev:webhook

# In another terminal, expose local server (optional)
pnpm run dev:ngrok
```

### 4. Deploy to Cloudflare Workers

```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Set your bot token as a secret
pnpm run secret
```

### 5. Setup Bot Commands

```bash
# Register bot commands with Telegram
pnpm run commands:setup
```

## 📁 Project Structure

```
scripts/
├── lifiQuote.ts        # LiFi bridge integration
├── acrossQuote.ts      # Across bridge integration
├── stargateQuote.ts   # Stargate bridge integration
├── hyperlaneQuote.ts  # Hyperlane bridge integration (WIP)
├── squidQuote.ts      # Squid bridge integration (WIP)
├── compareBridges.ts   # Quote comparison logic
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

src/
├── bot.ts              # Bot commands and mini app integration
├── worker.ts           # Cloudflare Worker entry point
├── env.ts              # Environment type definitions
├── botTypes.ts         # TypeScript interfaces
├── index.ts            # Main entry point
└── utils/
    └── telegramMessage.ts  # Telegram API utilities
```

## 🤖 Available Commands

The bot includes these bridge-related commands:

- `/quote <fromChain> <toChain> <token> <amount>` - Get quotes from all supported bridges
- `/execute <bridge> <params>` - Execute a transfer through selected bridge
- `/status <txHash>` - Check transaction status and get explorer link
- `/start` - Open the mini app with bridge interface
- `/help` - Show help information with bridge usage examples

## 🔧 Bridge Configuration

### Supported Chains
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- BSC
- Avalanche

### Token Support
- ETH/WETH
- USDC
- USDT
- DAI
- WBTC
- And more...

## 🌐 Usage Examples

### Get Bridge Quotes
```
/quote ethereum polygon USDC 1000
```

### Execute Transfer
```
/execute lifi ethereum polygon USDC 1000 0xRecipientAddress
```

### Check Transaction
```
/status 0x1234...abcd
```

## 🔧 Customization

### Adding New Bridges
1. Create new quote script in `scripts/` directory
2. Implement the bridge interface in `scripts/types/bridgeTypes.ts`
3. Add bridge to comparison logic in `scripts/compareBridges.ts`
4. Update bot commands in `src/bot.ts`

### Environment Variables
Update `src/env.ts` to add new configuration options:
```typescript
export interface Env {
  BOT_TOKEN: string;
  TG_CHAT_ID: string;
  MINI_APP_URL?: string;
  INFURA_KEY?: string;
  ALCHEMY_KEY?: string;
  USER_DATA?: KVNamespace;
}
```

## 🌐 Deployment

### Cloudflare Workers

1. **Deploy**: `pnpm run deploy`
2. **Set Secrets**: `pnpm run secret`
3. **Configure Webhook**: Point your bot's webhook to your deployed URL

### Environment Variables in Cloudflare
Set these in your Cloudflare Workers dashboard:

- `BOT_TOKEN`: Your Telegram bot token
- `TG_CHAT_ID`: Your chat ID for notifications
- `MINI_APP_URL`: Your production mini app URL
- `INFURA_KEY`: Infura API key for Ethereum access
- `ALCHEMY_KEY`: Alchemy API key for enhanced RPC access

## 📚 Development

### Available Scripts

- `pnpm run dev:webhook` - Start local development server
- `pnpm run dev:ngrok` - Expose local server via ngrok
- `pnpm run dev:all` - Run both dev servers
- `pnpm run deploy` - Deploy to Cloudflare Workers
- `pnpm run secret` - Set bot token secret
- `pnpm run commands:setup` - Register bot commands

### Testing Bridge Integrations

Test individual bridge integrations:
```bash
# Test LiFi quotes
bun run scripts/lifiQuote.ts

# Test Across quotes
bun run scripts/acrossQuote.ts

# Compare all bridges
bun run scripts/compareBridges.ts
```

## 🔒 Security

- Bot tokens are stored as Cloudflare Workers secrets
- No sensitive data in code
- Environment variables for configuration
- Rate limiting on quote requests

## 📖 Resources

- [GrammY Documentation](https://grammy.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [LiFi Documentation](https://docs.li.fi/)
- [Across Documentation](https://docs.across.to/)
- [Stargate Documentation](https://stargateprotocol.gitbook.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your bridge integration thoroughly
4. Submit a pull request with test results

## 📄 License

MIT License - feel free to use this for your own bridge aggregator projects!

---

**Happy bridging! 🌉**
