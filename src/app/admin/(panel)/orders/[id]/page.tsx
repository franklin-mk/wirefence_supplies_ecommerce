import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminOrderPanel } from "@/components/admin/order-panel";

export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: order } = await sb.from("orders").select("*, order_items(*)").eq("id", params.id).maybeSingle();
  if (!order) notFound();
  const { data: loc } = await sb.from("driver_locations").select("lat,lng,updated_at").eq("order_id", order.id).maybeSingle();
  return <AdminOrderPanel order={order} location={loc} />;
}
