"use server";

import { OakstackError } from "oakstack";
import { oakstack, OWNER_USER_ID } from "@/lib/oakstack";
import { addOrder } from "@/lib/orders";

export interface StepResult {
  step: string;
  ok: boolean;
  detail: string;
}

const why = (e: unknown) =>
  e instanceof OakstackError
    ? `${e.errorName}: ${e.message}`
    : e instanceof Error
      ? e.message
      : String(e);

/**
 * One order, four modules: a PDF invoice (print) attached to an email (post), a text to
 * the customer (ring), and a push notification to the shop owner (bell). Each step is
 * independent: a failure in one doesn't stop the others, and each says what happened.
 */
export async function placeOrder(_prev: unknown, form: FormData): Promise<StepResult[]> {
  const order = addOrder({
    customerName: String(form.get("name") || "Riley Chen"),
    customerEmail: String(form.get("email") || "riley@example.com"),
    customerPhone: String(form.get("phone") || "") || null,
    item: String(form.get("item") || "Starter kit"),
    amount: Number(form.get("amount") || 49),
  });
  const results: StepResult[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const email = await oakstack.post.emails.send({
      from: process.env.SHOP_FROM_EMAIL || "Acme Shop <orders@acme.example>",
      to: order.customerEmail,
      subject: `Your order ${order.id}`,
      text: `Thanks for your order, ${order.customerName}! Your invoice is attached.`,
      attachments: [
        {
          filename: `invoice-${order.id}.pdf`,
          // Rendered by Oakprint in the same call, from the hosted "invoice" template.
          print: {
            template: "invoice",
            data: {
              brand: { name: "Acme Shop", color: "#1f6f4a" },
              invoiceNumber: order.id,
              issueDate: today,
              from: {
                name: "Acme Shop",
                email: process.env.SHOP_OWNER_EMAIL || "owner@acme.example",
              },
              to: { name: order.customerName, email: order.customerEmail },
              currency: "USD",
              items: [{ description: order.item, quantity: 1, unitPrice: order.amount }],
              paid: true,
            },
          },
        },
      ],
      metadata: { orderId: order.id },
    });
    results.push({
      step: "Invoice emailed",
      ok: true,
      detail: `${email.status} (${email.mode} mode)`,
    });
  } catch (e) {
    results.push({ step: "Invoice emailed", ok: false, detail: why(e) });
  }

  if (order.customerPhone) {
    try {
      const text = await oakstack.ring.messages.send({
        to: order.customerPhone,
        body: `Acme Shop: order ${order.id} is confirmed. Reply STOP to opt out.`,
        metadata: { orderId: order.id },
      });
      results.push({
        step: "Customer texted",
        ok: true,
        detail: `${text.status} (${text.mode} mode)`,
      });
    } catch (e) {
      results.push({ step: "Customer texted", ok: false, detail: why(e) });
    }
  }

  try {
    const push = await oakstack.bell.notifications.send({
      userId: OWNER_USER_ID,
      title: `New order ${order.id}`,
      body: `${order.customerName}: ${order.item} ($${order.amount})`,
      // Opens the app when the notification is clicked (needs a full URL).
      ...(process.env.APP_URL ? { url: `${process.env.APP_URL.replace(/\/+$/, "")}/` } : {}),
    });
    results.push({
      step: "Owner notified",
      ok: true,
      detail:
        push.status === "no_devices"
          ? "no devices yet: click “Turn on notifications” first"
          : `${push.deviceCount} device(s), ${push.status}`,
    });
  } catch (e) {
    results.push({ step: "Owner notified", ok: false, detail: why(e) });
  }

  return results;
}

/** Registers this browser to receive the owner's push notifications. */
export async function registerPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<string> {
  const appId = process.env.OAKSTACK_PUSH_APP_ID;
  if (!appId) return "Run `npm run setup` first (it creates the web push app).";
  try {
    await oakstack.bell.devices.register({ appId, userId: OWNER_USER_ID, subscription });
    return "This browser will get a notification for every new order.";
  } catch (e) {
    return why(e);
  }
}

export interface ImportedProduct {
  name: string;
  quantity: number | null;
  price: number | null;
  confidence: number;
}

/** Reads a photo, screenshot, PDF, or pasted list into products to review (Oaklens). */
export async function importProducts(
  _prev: unknown,
  form: FormData,
): Promise<{ items: ImportedProduct[]; warnings: string[]; error?: string }> {
  const file = form.get("file");
  const text = String(form.get("text") ?? "").trim();
  const inputs = [];
  if (file instanceof File && file.size > 0) {
    inputs.push({
      data: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type || undefined,
      filename: file.name,
    });
  }
  if (text) inputs.push({ text });
  if (!inputs.length)
    return { items: [], warnings: [], error: "Add a photo, a PDF, or some text." };
  try {
    const result = await oakstack.lens.extract<{ items: ImportedProduct[] }>({
      template: "product-list",
      inputs,
    });
    return { items: result.data?.items ?? [], warnings: result.warnings };
  } catch (e) {
    return { items: [], warnings: [], error: why(e) };
  }
}
