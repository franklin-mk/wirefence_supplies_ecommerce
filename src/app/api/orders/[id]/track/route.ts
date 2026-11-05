import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Polled by the customer's tracking page. RLS ensures only the owner (or admin) can read. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_number,status,total,driver_name,drop_lat,drop_lng,county,sub_county,drop_off_point")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: events }, { data: loc }] = await Promise.all([
    supabase.from("order_events").select("status,note,created_at").eq("order_id", order.id).order("created_at"),
    supabase.from("driver_locations").select("lat,lng,heading,speed,updated_at").eq("order_id", order.id).maybeSingle(),
  ]);
  return NextResponse.json({ order, events: events ?? [], location: loc ?? null });
}
