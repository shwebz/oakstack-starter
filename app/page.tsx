"use client";

import { useActionState, useState } from "react";
import { importProducts, placeOrder, registerPush, type StepResult } from "./actions";

export default function Home() {
  const [steps, order, ordering] = useActionState<StepResult[], FormData>(placeOrder, []);
  const [imported, read, reading] = useActionState(importProducts, { items: [], warnings: [] });
  const [pushNote, setPushNote] = useState("");

  async function turnOnNotifications() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return setPushNote("Run `npm run setup` first.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return setPushNote(
        "This browser doesn't support web push (on iPhone, add the site to the Home Screen first).",
      );
    }
    if ((await Notification.requestPermission()) !== "granted") {
      return setPushNote("Notifications are blocked for this site.");
    }
    const reg = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(key),
      }));
    setPushNote(
      await registerPush(
        sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } },
      ),
    );
  }

  return (
    <main>
      <div>
        <h1>Acme Shop</h1>
        <p>
          An Oakstack starter: one API key for email, PDFs, texts, push, scheduled jobs, webhooks,
          and reading documents. With an <code>ok_test_</code> key, nothing is really sent.
        </p>
      </div>

      <section>
        <h2>1. Get order notifications on this device</h2>
        <p>Web push through Oakbell. Every new order and payment notifies the shop owner.</p>
        <button className="secondary" onClick={turnOnNotifications}>
          Turn on notifications
        </button>
        {pushNote && <p>{pushNote}</p>}
      </section>

      <section>
        <h2>2. Place a test order</h2>
        <p>
          Emails the customer a PDF invoice, texts them if there&apos;s a phone number, and notifies
          the owner.
        </p>
        <form action={order} className="grid">
          <label>
            Customer name
            <input name="name" defaultValue="Riley Chen" />
          </label>
          <label>
            Customer email
            <input name="email" type="email" defaultValue="riley@example.com" />
          </label>
          <label>
            Customer mobile (optional)
            <input name="phone" type="tel" placeholder="+1 612 555 0123" />
          </label>
          <label>
            Item
            <input name="item" defaultValue="Starter kit" />
          </label>
          <label>
            Amount ($)
            <input name="amount" type="number" min="1" defaultValue="49" />
          </label>
          <button disabled={ordering}>{ordering ? "Placing…" : "Place order"}</button>
        </form>
        {steps.length > 0 && (
          <ul>
            {steps.map((s) => (
              <li key={s.step} className={s.ok ? "ok" : "bad"}>
                {s.step}: {s.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>3. Import products from a photo</h2>
        <p>
          Oaklens reads a photo of boxes, a supplier&apos;s PDF, or a pasted list into products to
          review.
        </p>
        <form action={read} className="grid">
          <label>
            Photo or PDF
            <input name="file" type="file" accept="image/*,application/pdf" />
          </label>
          <label>
            Or paste a list
            <textarea
              name="text"
              rows={3}
              placeholder={"3x Space Marine Intercessors $60\n1x Paint set $35"}
            />
          </label>
          <button disabled={reading}>{reading ? "Reading…" : "Read products"}</button>
        </form>
        {imported.error && <p className="bad">{imported.error}</p>}
        {imported.items.length > 0 && (
          <ul>
            {imported.items.map((p, i) => (
              <li key={i}>
                {p.quantity ?? "?"} × {p.name}
                {p.price !== null ? ` at $${p.price}` : ""}
                {p.confidence < 0.7 ? " (check this one)" : ""}
              </li>
            ))}
          </ul>
        )}
        {imported.warnings.map((w) => (
          <p key={w} className="note">
            {w}
          </p>
        ))}
      </section>

      <section>
        <h2>Running in the background</h2>
        <p>
          <strong>Every evening</strong> Oakclock calls <code>/api/cron/daily-summary</code>, which
          emails the owner the day&apos;s orders. <strong>Payment webhooks</strong> arrive through
          an Oakhook relay at <code>/api/webhooks/payments</code>, retried and replayable. Both are
          created by <code>npm run setup</code>.
        </p>
      </section>
    </main>
  );
}

function urlBase64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
