import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
});

async function orderForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("orders")
    .select("id,order_number,status,county,sub_county,drop_off_point,tracker_expires_at")
    .eq("tracker_token", token)
    .maybeSingle();
  if (!data) return null;
  if (data.tracker_expires_at && new Date(data.tracker_expires_at) < new Date()) return null;
  if (!["PAID", "PROCESSING", "IN_TRANSIT"].includes(data.status)) return null;
  return data;
}

/** Driver phone pushes a GPS fix. The unguessable token is the credential. */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const order = await orderForToken(params.token);
  if (!order) return NextResponse.json({ error: "Link invalid or expired" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });

  await createAdminClient().from("driver_locations").upsert({
    order_id: order.id,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    heading: parsed.data.heading ?? null,
    speed: parsed.data.speed ?? null,
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

/** Lets the driver page show which delivery it is for. */
export async function GET(_: Request, { params }: { params: { token: string } }) {
  const order = await orderForToken(params.token);
  if (!order) return NextResponse.json({ error: "Link invalid or expired" }, { status: 404 });
  return NextResponse.json({ order });
}
