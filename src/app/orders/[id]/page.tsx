import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderTracker } from "@/components/order-tracker";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { stk?: string } }) {
  const { data: order } = await createClient()
    .from("orders").select("*, order_items(*)").eq("id", params.id).maybeSingle();
  if (!order) notFound();
  return <OrderTracker initial={order} stkSent={searchParams.stk === "1"} />;
}
