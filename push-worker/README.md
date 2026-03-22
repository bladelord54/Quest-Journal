# Quest Push Worker — Background Notification Server

A lightweight Cloudflare Worker that sends Web Push wake-up signals to the Life Quest Journal service worker on a cron schedule. This enables notifications at exact reminder times even when the app is closed.

## How It Works

1. **Client subscribes** — When the user enables notifications, the app sends their push subscription + reminder schedule to this worker.
2. **Cron fires every 5 minutes** — The worker checks each subscriber's local time against their morning/evening reminder times.
3. **Wake-up push sent** — If it's reminder time, a no-payload push wakes the service worker.
4. **SW shows notification** — The service worker checks its cached reminder data and displays the appropriate notification.

All reminder logic stays client-side. The server is just a "wake-up" mechanism.

## Setup (One-Time)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)

### 1. Install Wrangler CLI

```bash
cd push-worker
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 3. Create KV Namespace

```bash
npx wrangler kv namespace create PUSH_SUBS
```

Copy the `id` from the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PUSH_SUBS"
id = "<paste-id-here>"
```

### 4. Set the VAPID Private Key as a Secret

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```

When prompted, paste: `ofeMer9QMEJgUuopu0fUDCDOPFuYHc5kQPWKwTDXLzI`

### 5. Update VAPID_SUBJECT

In `wrangler.toml`, change `VAPID_SUBJECT` to your contact email:

```toml
VAPID_SUBJECT = "mailto:you@example.com"
```

### 6. Deploy

```bash
npx wrangler deploy
```

You'll get a URL like: `https://quest-push-worker.<your-account>.workers.dev`

### 7. Update the App

In `goal-manager.js`, set the `PUSH_WORKER_URL` in the constructor:

```js
this.PUSH_WORKER_URL = 'https://quest-push-worker.<your-account>.workers.dev';
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscribe` | Store/update a push subscription |
| POST | `/api/unsubscribe` | Remove a push subscription |
| GET | `/api/health` | Health check |

## Cron Schedule

The worker runs every 5 minutes (`*/5 * * * *`). For each subscriber:
- Calculates their local time using stored timezone offset
- Checks if current time is within 10 minutes of morning or evening reminder
- Sends a no-payload push if so (once per reminder per day)

## VAPID Keys

These keys are already generated and embedded in the app:

- **Public Key**: `BEOYktBAvxMuysBxOfSsxQDagGg8-UEqY2u1mYLrfHnRQowjNZmb47OsyKdsw0jCcrpCPdZvY1QEj1s2R-fJxc8`
- **Private Key**: Set as Cloudflare secret (see step 4)

> ⚠️ If you regenerate VAPID keys, you must update both the worker secret AND the `VAPID_PUBLIC_KEY` in `goal-manager.js` and `wrangler.toml`. Existing push subscriptions will become invalid.

## Costs

Cloudflare Workers free tier includes:
- 100,000 requests/day
- 10ms CPU time per invocation
- KV: 100,000 reads/day, 1,000 writes/day

For a personal app, this is effectively free.
