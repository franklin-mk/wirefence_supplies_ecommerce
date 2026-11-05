import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const [{ data: cats }, products] = await Promise.all([
    createClient().from("categories").select("*").order("sort_order"),
    getProducts({ category: searchParams.category, q: searchParams.q }),
  ]);
  const categories = (cats ?? []) as Category[];
  const active = categories.find((c) => c.slug === searchParams.category);

  return (
    <div className="space-y-6">
      {!searchParams.category && !searchParams.q && (
        <section className="rounded-2xl bg-primary px-6 py-10 text-primary-fg md:px-12 md:py-14">
          <h1 className="max-w-xl text-3xl font-extrabold leading-tight md:text-5xl">Fencing wire, mesh and posts. Delivered to your gate.</h1>
          <p className="mt-3 max-w-lg opacity-90">Barbed wire, chain link, weld mesh, gate wire and treated posts. Pay with M-Pesa and track your lorry live.</p>
          <a href="#products" className="mt-6 inline-block rounded-lg bg-bg px-6 py-3 font-bold text-primary">Shop now</a>
        </section>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Link href="/" className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${!active ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/?category=${c.slug}`} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${active?.id === c.id ? "border-primary bg-primary text-primary-fg" : "border-border"}`}>{c.name}</Link>
        ))}
      </div>

      <section id="products">
        <h2 className="mb-1 text-xl font-extrabold">
          {searchParams.q ? `Results for “${searchParams.q}”` : active ? active.name : "All products"}
        </h2>
        {active?.description && <p className="mb-4 text-sm text-muted">{active.description}</p>}
        {products.length === 0 ? (
          <p className="card p-8 text-center text-muted">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
