import { verifySignature } from "oakstack";
import { oakstack } from "@/lib/oakstack";
import { ordersSince } from "@/lib/orders";

/**
 * Oakclock calls this every evening (see scripts/setup.ts). The Oakstack-Signature header
 * proves the call came from your Oakstack job; anything else gets a 401.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const ok = await verifySignature(
    process.env.OAKSTACK_CRON_SECRET ?? "",
    request.headers.get("oakstack-signature"),
    body,
  );
  if (!ok) return new Response("Bad signature", { status: 401 });

  const since = new Date(Date.now() - 24 * 3600_000);
  const orders = ordersSince(since);
  const total = orders.reduce((n, o) => n + o.amount, 0);
  await oakstack.post.emails.send({
    from: process.env.SHOP_FROM_EMAIL || "Acme Shop <orders@acme.example>",
    to: process.env.SHOP_OWNER_EMAIL || "owner@acme.example",
    subject: `Today: ${orders.length} order(s), $${total}`,
    text: orders.length
      ? orders.map((o) => `${o.id}  ${o.customerName}  ${o.item}  $${o.amount}`).join("\n")
      : "No orders in the last 24 hours.",
  });
  // A 2xx tells Oakstack the run succeeded; anything else is retried and logged.
  return Response.json({ orders: orders.length, total });
}
