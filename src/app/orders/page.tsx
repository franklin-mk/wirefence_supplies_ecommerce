import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { data: orders } = await createClient()
    .from("orders").select("id,order_number,status,total,created_at").order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-extrabold">My orders</h1>
      {!orders?.length && <p className="card p-8 text-center text-muted">No orders yet.</p>}
      {orders?.map((o: any) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="card flex items-center justify-between p-4 hover:shadow">
          <div>
            <p className="font-bold">{o.order_number}</p>
            <p className="text-xs text-muted">{new Date(o.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}</p>
          </div>
          <div className="text-right">
            <p className="font-extrabold text-primary">{formatKsh(Number(o.total))}</p>
            <StatusBadge status={o.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
