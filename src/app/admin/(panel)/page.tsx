import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const sb = createClient();
  const [{ data: orders }, { count: pendingReviews }, { data: lowStock }] = await Promise.all([
    sb.from("orders").select("status,total"),
    sb.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("variants").select("id,label,stock,products(name)").lte("stock", 10).order("stock").limit(8),
  ]);

  const paid = (orders ?? []).filter((o: any) => ["PAID", "PROCESSING", "IN_TRANSIT", "DELIVERED"].includes(o.status));
  const revenue = paid.reduce((n: number, o: any) => n + Number(o.total), 0);
  const toFulfil = (orders ?? []).filter((o: any) => ["PAID", "PROCESSING"].includes(o.status)).length;
  const inTransit = (orders ?? []).filter((o: any) => o.status === "IN_TRANSIT").length;

  const tiles = [
    ["Revenue (paid)", formatKsh(revenue)], ["To fulfil", String(toFulfil)], ["In transit", String(inTransit)], ["Reviews to moderate", String(pendingReviews ?? 0)],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([k, v]) => (<div key={k} className="card p-4"><p className="text-xs font-semibold uppercase text-muted">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>))}
      </div>
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Low stock (≤ 10)</h2><Link href="/admin/products" className="text-sm font-semibold text-primary">Manage</Link></div>
        {!lowStock?.length ? <p className="text-sm text-muted">All variants are well stocked.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lowStock.map((v: any) => (<li key={v.id} className="flex justify-between py-2"><span>{v.products?.name} <span className="text-muted">({v.label})</span></span><b className={v.stock === 0 ? "text-danger" : ""}>{v.stock}</b></li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
