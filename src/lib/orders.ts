import { createAdminClient } from "@/lib/supabase/server";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { sendMail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

export async function addEvent(orderId: string, status: OrderStatus, note?: string) {
  await createAdminClient().from("order_events").insert({ order_id: orderId, status, note: note ?? null });
}

/**
 * Idempotently marks an order PAID: sets status, decrements stock, logs the event,
 * then generates the PDF receipt and emails it. Safe to call twice (callback retries).
 */
export async function markOrderPaid(orderId: string, opts: { mpesaReceipt?: string; manualNote?: string }) {
  const db = createAdminClient();

  const { data: updated } = await db
    .from("orders")
    .update({
      status: "PAID",
      mpesa_receipt: opts.mpesaReceipt ?? null,
      manual_payment_note: opts.manualNote ?? null,
    })
    .eq("id", orderId)
    .in("status", ["PENDING_PAYMENT", "FAILED"])
    .select("id")
    .maybeSingle();

  if (!updated) return { alreadyProcessed: true };

  await db.rpc("decrement_stock_for_order", { p_order: orderId });
  await addEvent(orderId, "PAID", opts.mpesaReceipt ? `M-Pesa ${opts.mpesaReceipt}` : opts.manualNote);

  try {
    await sendReceipt(orderId);
  } catch (e) {
    // Payment is already recorded; a failed email must not roll it back. Admin can resend.
    console.error("Receipt email failed", e);
  }
  return { alreadyProcessed: false };
}

export async function sendReceipt(orderId: string) {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*, order_items(*)").eq("id", orderId).single();
  if (!order) throw new Error("Order not found");
  const { data: userRes } = await db.auth.admin.getUserById(order.user_id);
  const email = userRes.user?.email;
  if (!email) throw new Error("Customer has no email");

  const pdf = await buildReceiptPdf({
    orderNumber: order.order_number,
    date: new Date(order.created_at),
    mpesaReceipt: order.mpesa_receipt,
    customer: { name: order.full_name, phone: order.phone, email },
    delivery: {
      county: order.county,
      subCounty: order.sub_county,
      dropOff: order.drop_off_point,
      notes: order.transport_notes,
    },
    items: order.order_items.map((i: any) => ({
      name: i.product_name,
      variant: i.variant_label,
      qty: i.qty,
      unitPrice: Number(i.unit_price),
    })),
    subtotal: Number(order.subtotal),
    transport: Number(order.transport_fee),
    total: Number(order.total),
  });

  await sendMail({
    to: email,
    subject: `Receipt for order ${order.order_number}`,
    html: `<p>Hi ${order.full_name},</p><p>Payment received for order <b>${order.order_number}</b>. Your receipt is attached.</p>
           <p><a href="${siteUrl()}/orders/${order.id}">Track your delivery</a></p>`,
    attachments: [{ filename: `receipt-${order.order_number}.pdf`, content: pdf }],
  });
  await db.from("orders").update({ receipt_sent_at: new Date().toISOString() }).eq("id", orderId);
}

export async function markOrderFailed(orderId: string, reason: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .update({ status: "FAILED" })
    .eq("id", orderId)
    .eq("status", "PENDING_PAYMENT")
    .select("id")
    .maybeSingle();
  if (data) await addEvent(orderId, "FAILED", reason);
}
