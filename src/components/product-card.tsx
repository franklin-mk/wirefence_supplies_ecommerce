import Link from "next/link";
import type { Product } from "@/lib/types";
import { cldUrl } from "@/lib/cld-url";
import { formatKsh } from "@/lib/utils";
import { minPrice } from "@/lib/catalog";
import { Stars } from "@/components/stars";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.variants.every((v) => v.stock <= 0);
  return (
    <Link href={`/products/${product.slug}`} className="card group relative block overflow-hidden transition hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldUrl(product.images[0], 500)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        <WishlistButton productId={product.id} className="absolute right-2 top-2" />
        {outOfStock && <span className="absolute left-2 top-2 rounded bg-danger px-2 py-0.5 text-xs font-bold text-white">Out of stock</span>}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{product.category?.name}</p>
        <h3 className="line-clamp-2 font-bold leading-snug">{product.name}</h3>
        {!!product.rating_count && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <Stars value={product.rating_avg ?? 0} /> ({product.rating_count})
          </div>
        )}
        <p className="pt-1 text-sm text-muted">From</p>
        <p className="-mt-1 text-lg font-extrabold text-primary">{formatKsh(minPrice(product))}</p>
      </div>
    </Link>
  );
}
