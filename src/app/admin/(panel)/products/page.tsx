import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const { data: products } = await createClient()
    .from("products").select("id,name,slug,is_active,category:categories(name),variants(price,stock)").order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary !py-2">+ New product</Link>
      </div>
      <div className="card divide-y divide-border">
        {products?.map((p: any) => {
          const stock = p.variants.reduce((n: number, v: any) => n + v.stock, 0);
          const min = p.variants.length ? Math.min(...p.variants.map((v: any) => Number(v.price))) : 0;
          return (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-bg">
              <div>
                <p className="font-bold">{p.name} {!p.is_active && <span className="ml-1 rounded bg-border px-1.5 text-xs">hidden</span>}</p>
                <p className="text-xs text-muted">{p.category?.name} · {p.variants.length} variants</p>
              </div>
              <div className="text-right text-sm"><p className="font-semibold">from {formatKsh(min)}</p><p className={stock === 0 ? "text-danger" : "text-muted"}>{stock} in stock</p></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
