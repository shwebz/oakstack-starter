# Oakstack Next.js starter: Acme Shop

A small shop back office that uses one Oakstack API key for everything a real app ends up needing:

| When               | What happens                                                                  | Oakstack module  |
| ------------------ | ----------------------------------------------------------------------------- | ---------------- |
| A customer orders  | They get an email with a **PDF invoice** attached                             | `post` + `print` |
|                    | They get a **text** confirming it (if they gave a mobile number)              | `ring`           |
|                    | The shop owner gets a **push notification** on every device they turned it on | `bell`           |
| Every evening at 6 | A **scheduled job** emails the owner the day's orders                         | `clock` + `post` |
| A payment succeeds | The provider's **webhook** arrives through a relay that never drops events    | `hook` + `bell`  |
| New stock arrives  | A **photo of the boxes** becomes a product list to review                     | `lens`           |

Everything is in a handful of files: [`app/actions.ts`](app/actions.ts) (orders, push registration, product import), [`app/api/cron/daily-summary/route.ts`](app/api/cron/daily-summary/route.ts), [`app/api/webhooks/payments/route.ts`](app/api/webhooks/payments/route.ts), and [`scripts/setup.mjs`](scripts/setup.mjs).

## Run it

1. **Get a key.** Sign up at https://oakstack.dev and create an API key. Start with a **test key** (`ok_test_...`): every call is checked, counted, and logged exactly like a real one, but no email, text, or push is actually sent.
2. **Install and configure:**

   ```sh
   npm install
   cp .env.example .env.local   # then fill in OAKSTACK_API_KEY
   ```

3. **Give it a public URL** (Oakstack calls your app for the scheduled job and webhooks, and never calls localhost):

   ```sh
   npm run dev
   cloudflared tunnel --url http://localhost:3000   # in another terminal; or deploy to Vercel
   ```

   Put the https URL in `.env.local` as `APP_URL`.

4. **Create the job, webhook relay, and push app** (safe to run again):

   ```sh
   npm run setup
   ```

   Restart `npm run dev`, open the app, click **Turn on notifications**, and place an order.

Then open https://oakstack.dev/dashboard: every email, text, push, job run, and webhook is there with what happened to it.

## Going live

- **Email:** add your domain on the dashboard's Email page, add the DNS records it shows, and set `SHOP_FROM_EMAIL` to an address on it.
- **Texts:** get a number on the SMS page (carriers review it in a few business days).
- **Push on phones:** the same `bell` calls work for iOS and Android apps once you add your Apple or Firebase key on the Push page.
- Switch `OAKSTACK_API_KEY` to a live key (`ok_live_...`).

## Using an AI coding agent?

Install the Oakstack plugin for Claude Code (`/plugin marketplace add shwebz/oakstack-plugin`, then `/plugin install oakstack@oakstack`) or point any MCP client at `https://oakstack.dev/mcp`. Agents can read the full docs at https://oakstack.dev/llms.txt.

Orders are kept in memory to keep the example dependency-free; swap [`lib/orders.ts`](lib/orders.ts) for your database.
