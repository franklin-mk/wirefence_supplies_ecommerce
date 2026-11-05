import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseCallback, type StkCallbackBody } from "@/lib/payments/mpesa";
import { markOrderFailed, markOrderPaid } from "@/lib/orders";

// Daraja always expects a 200 + ResultCode 0 ack, otherwise it retries.
const ack = () => NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.MPESA_CALLBACK_SECRET || token !== process.env.MPESA_CALLBACK_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: StkCallbackBody;
  try {
    body = await req.json();
  } catch {
    return ack();
  }
  if (!body?.Body?.stkCallback) return ack();

  const cb = parseCallback(body);
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders").select("id,total,status").eq("mpesa_checkout_id", cb.checkoutRequestId).maybeSingle();
  if (!order) return ack();

  if (cb.success) {
    // Guard against underpayment / tampered amounts.
    if (cb.amount !== undefined && cb.amount < Math.ceil(Number(order.total))) {
      await markOrderFailed(order.id, `Amount mismatch: received ${cb.amount}`);
    } else {
      await markOrderPaid(order.id, { mpesaReceipt: cb.receipt });
    }
  } else {
    await markOrderFailed(order.id, cb.resultDesc);
  }
  return ack();
}
