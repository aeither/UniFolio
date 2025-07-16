# Telegram Mini App Starter for Cloudflare Workers

A clean, minimal starter template for building Telegram mini apps with Cloudflare Workers and TypeScript.

## 🚀 Features

- **Mini App Integration**: Direct integration with Telegram's mini app platform
- **TypeScript**: Full type safety and IntelliSense support
- **Cloudflare Workers**: Serverless deployment with global edge network
- **GrammY**: Modern Telegram Bot API framework
- **Easy Setup**: Minimal configuration required
- **Environment-based URLs**: Separate URLs for development and production

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))
- Mini app URL (your web application)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cf-tg-mini-app-starter
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

The starter includes these basic commands:

- `/start` - Open the mini app with a button
- `/run <url>` - Open any URL in mini app
- `/help` - Show help information  
- `/ping` - Test bot responsiveness

## 🔧 Customization

### Mini App Configuration

The bot automatically uses the appropriate URL based on your environment:

- **Development**: Uses hardcoded dev URL (`basically-enough-clam.ngrok-free.app`)
- **Production**: Uses `MINI_APP_URL` (your production mini app URL)

### Adding New Commands

Edit `src/bot.ts` to add your own commands:

```typescript
bot.command("mycommand", async (ctx) => {
  await ctx.reply("Hello from my custom command!");
});
```

### Environment Variables

Update `src/env.ts` to add new environment variables:

```typescript
export interface Env {
  BOT_TOKEN: string;
  TG_CHAT_ID: string;
  MINI_APP_URL?: string;
  MY_API_KEY?: string;  // Add your new variables here
  USER_DATA?: KVNamespace;
}
```

### Scheduled Tasks

The bot includes a scheduled event handler in `src/worker.ts` that runs every 6 hours. Customize it for your needs:

```typescript
async scheduled(event: any, env: Env, ctx: ExecutionContext): Promise<void> {
  // Add your scheduled tasks here
  console.log('Running scheduled task...');
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
- `MINI_APP_URL`: Your production mini app URL (optional, defaults to dev URL)

## 📚 Development

### Available Scripts

- `pnpm run dev:webhook` - Start local development server
- `pnpm run dev:ngrok` - Expose local server via ngrok
- `pnpm run dev:all` - Run both dev servers
- `pnpm run deploy` - Deploy to Cloudflare Workers
- `pnpm run secret` - Set bot token secret
- `pnpm run commands:setup` - Register bot commands

### Local Development

1. Start the development server: `pnpm run dev:webhook`
2. Use ngrok to expose your local server: `pnpm run dev:ngrok`
3. Set your bot's webhook URL to the ngrok URL + `/webhook`

## 🔒 Security

- Bot tokens are stored as Cloudflare Workers secrets
- No sensitive data in code
- Environment variables for configuration

## 📖 Resources

- [GrammY Documentation](https://grammy.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this starter for your own projects!

---

**Happy coding! 🚀**