import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { paymentProvider } from "@/lib/payments/mpesa";
import { normalizeKePhone } from "@/lib/utils";

/** Re-send the STK prompt for an unpaid order (optionally to a different number). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { orderId, mpesaPhone } = await req.json();
  // RLS-scoped read proves the order belongs to this user.
  const { data: order } = await auth.supabase
    .from("orders").select("id,order_number,total,phone,status").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!["PENDING_PAYMENT", "FAILED"].includes(order.status))
    return NextResponse.json({ error: "Order is already paid or closed." }, { status: 409 });

  const phone = normalizeKePhone(mpesaPhone ?? order.phone);
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  try {
    const stk = await paymentProvider.initiate({
      phone, amount: Number(order.total), accountRef: order.order_number, description: "Fencing order",
    });
    await createAdminClient()
      .from("orders")
      .update({ status: "PENDING_PAYMENT", mpesa_checkout_id: stk.checkoutRequestId, mpesa_merchant_request_id: stk.merchantRequestId })
      .eq("id", order.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
