import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: { searchParams: { status?: string } }) {
  let q = createClient().from("orders").select("id,order_number,status,total,full_name,county,created_at").order("created_at", { ascending: false }).limit(200);
  if (searchParams.status) q = q.eq("status", searchParams.status);
  const { data: orders } = await q;
  const filters = ["PENDING_PAYMENT", "PAID", "PROCESSING", "IN_TRANSIT", "DELIVERED", "FAILED"];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Orders</h1>
      <div className="no-scrollbar flex gap-2 overflow-x-auto text-sm">
        <Link href="/admin/orders" className="rounded-full border border-border px-3 py-1.5 font-semibold">All</Link>
        {filters.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} className={`whitespace-nowrap rounded-full border px-3 py-1.5 font-semibold ${searchParams.status === s ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>{s.replace(/_/g, " ")}</Link>)}
      </div>
      <div className="card divide-y divide-border">
        {!orders?.length && <p className="p-6 text-center text-muted">No orders.</p>}
        {orders?.map((o: any) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-bg">
            <div><p className="font-bold">{o.order_number} · {o.full_name}</p><p className="text-xs text-muted">{o.county} · {new Date(o.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p></div>
            <div className="text-right"><p className="font-semibold">{formatKsh(Number(o.total))}</p><StatusBadge status={o.status} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
