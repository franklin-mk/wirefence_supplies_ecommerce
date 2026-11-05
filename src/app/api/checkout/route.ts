import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { estimateTransport } from "@/lib/transport";
import { normalizeKePhone } from "@/lib/utils";
import { paymentProvider } from "@/lib/payments/mpesa";
import { addEvent } from "@/lib/orders";

const schema = z.object({
  lines: z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(10000) })).min(1),
  fullName: z.string().min(2).max(120),
  phone: z.string(),
  whatsapp: z.string(),
  county: z.string().min(2),
  subCounty: z.string().min(2).max(120),
  dropOffPoint: z.string().min(3).max(300),
  dropLat: z.number().min(-5).max(6).nullable().optional(),
  dropLng: z.number().min(33).max(42).nullable().optional(),
  transportNotes: z.string().max(600).optional(),
  mpesaPhone: z.string().optional(), // defaults to primary phone
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  // Mandatory email verification before any order is processed.
  if (!user.email_confirmed_at)
    return NextResponse.json({ error: "Please verify your email address before placing an order." }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid details", issues: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const phone = normalizeKePhone(b.phone);
  const whatsapp = normalizeKePhone(b.whatsapp);
  const payPhone = normalizeKePhone(b.mpesaPhone ?? b.phone);
  if (!phone || !whatsapp || !payPhone)
    return NextResponse.json({ error: "Enter valid Kenyan phone numbers (e.g. 0712345678)." }, { status: 400 });

  const db = createAdminClient();

  // Re-price from the database: never trust client prices.
  const ids = b.lines.map((l) => l.variantId);
  const { data: variants, error: vErr } = await db
    .from("variants")
    .select("id,label,price,stock,weight_kg,products(name,is_active)")
    .in("id", ids);
  if (vErr || !variants || variants.length !== new Set(ids).size)
    return NextResponse.json({ error: "Some items are no longer available." }, { status: 409 });

  let subtotal = 0;
  let weight = 0;
  const items = [];
  for (const l of b.lines) {
    const v: any = variants.find((x) => x.id === l.variantId)!;
    if (!v.products?.is_active) return NextResponse.json({ error: `${v.products?.name ?? "Item"} is unavailable.` }, { status: 409 });
    if (v.stock < l.qty)
      return NextResponse.json({ error: `Only ${v.stock} left of ${v.products.name} (${v.label}).` }, { status: 409 });
    subtotal += Number(v.price) * l.qty;
    weight += Number(v.weight_kg) * l.qty;
    items.push({ variant_id: v.id, product_name: v.products.name, variant_label: v.label, unit_price: v.price, qty: l.qty });
  }
  const transport = estimateTransport(b.county, weight).fee;
  const total = subtotal + transport;

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      user_id: user.id,
      subtotal,
      transport_fee: transport,
      total,
      full_name: b.fullName,
      phone,
      whatsapp,
      county: b.county,
      sub_county: b.subCounty,
      drop_off_point: b.dropOffPoint,
      drop_lat: b.dropLat ?? null,
      drop_lng: b.dropLng ?? null,
      transport_notes: b.transportNotes ?? null,
    })
    .select("id,order_number")
    .single();
  if (oErr || !order) return NextResponse.json({ error: "Could not create order." }, { status: 500 });

  await db.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id })));
  await addEvent(order.id, "PENDING_PAYMENT", "Order received, awaiting M-Pesa payment");

  try {
    const stk = await paymentProvider.initiate({
      phone: payPhone,
      amount: total,
      accountRef: order.order_number,
      description: "Fencing order",
    });
    await db
      .from("orders")
      .update({ mpesa_checkout_id: stk.checkoutRequestId, mpesa_merchant_request_id: stk.merchantRequestId })
      .eq("id", order.id);
    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, stkSent: true });
  } catch (e: any) {
    // Order exists; customer can retry the prompt from the order page.
    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, stkSent: false, error: e.message });
  }
}
