/* global process, console */
// One-time setup for this starter (safe to run again): creates the evening summary job,
// the payments webhook relay, and the web push app in your Oakstack workspace, then
// writes their settings into .env.local.
//
//   npm run setup
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Oakstack } from "oakstack";

const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
if (!/^https:\/\//.test(appUrl)) {
  console.error(
    "Set APP_URL in .env.local to this app's public https URL first.\n" +
      "Locally: run `cloudflared tunnel --url http://localhost:3000` and use the https URL it prints.",
  );
  process.exit(1);
}
const oakstack = new Oakstack();
const env = {};

// 1. Evening summary (Oakclock): calls the app at 6pm every day.
const jobName = "Acme daily summary";
let job = (await oakstack.clock.jobs.list()).find((j) => j.name === jobName);
job = job
  ? await oakstack.clock.jobs.update(job.id, { url: `${appUrl}/api/cron/daily-summary` })
  : await oakstack.clock.jobs.create({
      name: jobName,
      schedule: "0 18 * * *",
      timezone: process.env.SHOP_TIMEZONE ?? "America/Chicago",
      url: `${appUrl}/api/cron/daily-summary`,
      method: "POST",
    });
env.OAKSTACK_CRON_SECRET = (await oakstack.clock.jobs.get(job.id)).signingSecret;
console.log(`✓ Scheduled job "${jobName}" (${job.schedule}, ${job.timezone})`);

// 2. Payments webhook relay (Oakhook).
const endpointName = "Acme payments";
let endpoint = (await oakstack.hook.endpoints.list()).find((e) => e.name === endpointName);
endpoint = endpoint
  ? await oakstack.hook.endpoints.update(endpoint.id, {
      forwardUrl: `${appUrl}/api/webhooks/payments`,
    })
  : await oakstack.hook.endpoints.create({
      name: endpointName,
      forwardUrl: `${appUrl}/api/webhooks/payments`,
    });
env.OAKSTACK_WEBHOOK_SECRET = (await oakstack.hook.endpoints.get(endpoint.id)).signingSecret;
console.log(`✓ Webhook relay "${endpointName}"`);
console.log(`    Give your payment provider this URL: ${endpoint.url}`);

// 3. Web push app (Oakbell): Oakstack generates the keys.
const pushName = "Acme website";
const push =
  (await oakstack.bell.apps.list()).find((a) => a.name === pushName) ??
  (await oakstack.bell.apps.create({
    platform: "web",
    name: pushName,
    subject: `mailto:${process.env.SHOP_OWNER_EMAIL || "owner@example.com"}`,
  }));
env.OAKSTACK_PUSH_APP_ID = push.id;
env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = push.config.vapidPublicKey;
console.log(`✓ Web push app "${pushName}"`);

// Write the settings into .env.local (replacing old values).
const file = ".env.local";
let text = existsSync(file) ? readFileSync(file, "utf8") : "";
for (const [key, value] of Object.entries(env)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  text = pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}
writeFileSync(file, text);
console.log(
  `\nSaved ${Object.keys(env).join(", ")} to .env.local. Restart \`npm run dev\` to load them.`,
);
