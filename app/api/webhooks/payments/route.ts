import { verifySignature } from "oakstack";
import { oakstack, OWNER_USER_ID } from "@/lib/oakstack";

/**
 * Your payment provider (Stripe, Square, ...) sends webhooks to the Oakhook URL that
 * `npm run setup` printed, never directly here. Oakstack stores each event, forwards it
 * here with the original headers and body, and retries for hours if this app is down, so
 * no payment is ever missed during a deploy. Replay any event from the dashboard.
 *
 * Verify the Oakstack signature (below), and keep verifying your provider's own
 * signature too: it still matches, because headers and body are forwarded unchanged.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const ok = await verifySignature(
    process.env.OAKSTACK_WEBHOOK_SECRET ?? "",
    request.headers.get("oakstack-signature"),
    body,
    // Relayed events can arrive hours late (retries), so allow an older timestamp.
    { toleranceSeconds: 30 * 24 * 3600 },
  );
  if (!ok) return new Response("Bad signature", { status: 401 });

  const event = JSON.parse(body) as { type?: string; data?: { object?: { amount?: number } } };
  if (event.type === "payment_intent.succeeded") {
    const cents = event.data?.object?.amount ?? 0;
    await oakstack.bell.notifications.send({
      userId: OWNER_USER_ID,
      title: "Payment received",
      body: `$${(cents / 100).toFixed(2)}`,
      // Webhooks can repeat; a newer notification replaces an older one with the same key.
      collapseKey: "payments",
    });
  }
  return new Response("ok");
}
