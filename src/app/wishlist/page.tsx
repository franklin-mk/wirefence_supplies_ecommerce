"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/hooks/use-hydrated";
import { cldUrl } from "@/lib/cld-url";
import { formatKsh } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";

type Row = { id: string; slug: string; name: string; images: string[]; variants: { price: number }[] };

export default function WishlistPage() {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!ids.length) { setRows([]); setLoading(false); return; }
    createClient().from("products").select("id,slug,name,images,variants(price)").in("id", ids).eq("is_active", true)
      .then(({ data }) => { setRows((data ?? []) as unknown as Row[]); setLoading(false); });
  }, [hydrated, ids]);

  if (!hydrated || loading) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Wishlist</h1>
      {!rows.length ? (
        <p className="card p-8 text-center text-muted">Nothing saved yet. Tap the heart on any product. <Link href="/" className="font-bold text-primary">Browse</Link></p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} className="card relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldUrl(p.images[0], 400)} alt={p.name} className="aspect-square w-full object-cover" />
              <WishlistButton productId={p.id} className="absolute right-2 top-2" />
              <div className="p-3">
                <p className="font-bold">{p.name}</p>
                <p className="font-extrabold text-primary">From {formatKsh(Math.min(...p.variants.map((v) => Number(v.price))))}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
