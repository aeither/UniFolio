# cf-tg-mini-app-starter

## Info
.dev for polling
.dev.vars for cf webhook

## Mini App Configuration

### Environment Variables
- `BOT_TOKEN`: Your Telegram bot token
- `TG_CHAT_ID`: Your chat ID for notifications
- `MINI_APP_URL`: Production mini app URL (optional, defaults to dev URL)

### Mini App Features
- Opens mini app when user runs `/start` command
- Automatically uses dev URL (`basically-enough-clam.ngrok-free.app`) when no production URL is set
- Uses production URL when `MINI_APP_URL` is configured
- `/run <url>` command to open any URL in mini app

## Development

### Start polling
bun run dev.ts

### For webhook testing (optional)
bunx wrangler dev src/worker.ts

### Setup bot commands
pnpm run commands:setup

---

## Production

### Install Wrangler CLI
bunx wrangler login

### Deploy to Cloudflare
bunx wrangler deploy

### Set secrets in production
bunx wrangler secret put BOT_TOKEN
bunx wrangler secret put MINI_APP_URL

### Set webhook after deployment (* remember the slash at the end of the url /)
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
     -d '{"url": "https://your-deployed-worker-url.workers.dev/"}' \
     -H "Content-Type: application/json"

---

## Scheduled
npx wrangler dev src/worker.ts --test-scheduled
pn dev:ngrok

curl "http://localhost:3000/cdn-cgi/handler/scheduled"