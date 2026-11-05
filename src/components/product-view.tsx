"use client";
import { useMemo, useState } from "react";
import { Check, MessageCircle, Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import type { Product, Review } from "@/lib/types";
import { Gallery } from "@/components/gallery";
import { Reviews } from "@/components/reviews";
import { Stars } from "@/components/stars";
import { WishlistButton } from "@/components/wishlist-button";
import { useCart } from "@/store/cart";
import { COUNTIES, estimateTransport } from "@/lib/transport";
import { formatKsh, productWhatsappMessage, whatsappLink } from "@/lib/utils";

const TABS = ["Overview", "Specifications", "Delivery & Transport", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function ProductView({ product, reviews, initialVariantId }: { product: Product; reviews: Review[]; initialVariantId?: string }) {
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.id === initialVariantId)?.id ?? product.variants.find((v) => v.stock > 0)?.id ?? product.variants[0]?.id
  );
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("Overview");
  const [added, setAdded] = useState(false);
  const [county, setCounty] = useState("Nairobi");
  const add = useCart((s) => s.add);

  const variant = product.variants.find((v) => v.id === variantId);
  const inStock = !!variant && variant.stock > 0;
  const maxQty = variant?.stock ?? 1;
  const est = useMemo(() => (variant ? estimateTransport(county, Number(variant.weight_kg) * qty) : null), [variant, qty, county]);

  function addToCart() {
    if (!variant || !inStock) return;
    add({
      variantId: variant.id, productId: product.id, slug: product.slug, name: product.name,
      variantLabel: variant.label, price: Number(variant.price), weightKg: Number(variant.weight_kg), image: product.images[0] ?? null,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const waHref = variant
    ? whatsappLink(productWhatsappMessage(product.name, variant.label, Number(variant.price), `${origin}/products/${product.slug}?variant=${variant.id}`) + (qty > 1 ? ` Quantity: ${qty}.` : ""))
    : "#";

  const ActionButtons = ({ className = "" }: { className?: string }) => (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <button onClick={addToCart} disabled={!inStock} className="btn-primary">
        {added ? <><Check size={18} /> Added</> : <><ShoppingCart size={18} /> Add to Cart</>}
      </button>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-outline"><MessageCircle size={18} /> Order via WhatsApp</a>
    </div>
  );

  return (
    <div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative">
          <Gallery images={product.images} alt={product.name} />
          <WishlistButton productId={product.id} className="absolute left-3 top-3 !h-11 !w-11" />
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{product.category?.name}</p>
            <h1 className="text-2xl font-extrabold md:text-3xl">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Stars value={product.rating_avg ?? 0} /> <span>{product.rating_count ? `${product.rating_avg} (${product.rating_count})` : "No reviews yet"}</span>
            </div>
          </div>

          <p className="text-3xl font-extrabold text-primary">{variant ? formatKsh(Number(variant.price)) : "—"}</p>

          <div>
            <p className="label">Size / Variant</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button key={v.id} onClick={() => { setVariantId(v.id); setQty(1); }} disabled={v.stock <= 0}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:line-through ${v.id === variantId ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {v.label}
                </button>
              ))}
            </div>
            {variant && (
              <p className={`mt-2 text-sm font-semibold ${inStock ? (variant.stock < 10 ? "text-accent" : "text-success") : "text-danger"}`}>
                {inStock ? (variant.stock < 10 ? `Only ${variant.stock} left` : "In stock") : "Out of stock"}
                <span className="font-normal text-muted"> · {Number(variant.weight_kg)} kg each · SKU {variant.sku}</span>
              </p>
            )}
          </div>

          <div>
            <p className="label">Quantity</p>
            <div className="inline-flex items-center rounded-lg border border-border">
              <button className="px-3 py-2.5" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus size={16} /></button>
              <input value={qty} onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))} className="w-14 bg-transparent text-center font-bold outline-none" inputMode="numeric" />
              <button className="px-3 py-2.5" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="Increase"><Plus size={16} /></button>
            </div>
          </div>

          {/* Desktop actions (mobile uses the sticky bar below) */}
          <ActionButtons className="hidden md:grid" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted"}`}>
              {t}{t === "Reviews" && ` (${product.rating_count ?? 0})`}
            </button>
          ))}
        </div>
        <div className="py-6">
          {tab === "Overview" && (
            <div className="max-w-3xl space-y-3">
              <p className="font-semibold">{product.summary}</p>
              <p className="whitespace-pre-wrap leading-relaxed text-muted">{product.description}</p>
            </div>
          )}
          {tab === "Specifications" && (
            <dl className="card max-w-2xl divide-y divide-border">
              {variant && (
                <>
                  <div className="flex justify-between p-3 text-sm"><dt className="text-muted">Weight per unit</dt><dd className="font-semibold">{Number(variant.weight_kg)} kg</dd></div>
                  {Object.entries(variant.attributes ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-3 text-sm"><dt className="capitalize text-muted">{k.replace(/_/g, " ")}</dt><dd className="font-semibold">{v}</dd></div>
                  ))}
                </>
              )}
              {Object.entries(product.specs ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between p-3 text-sm"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          )}
          {tab === "Delivery & Transport" && (
            <div className="max-w-2xl space-y-4">
              <p className="text-muted">We deliver by lorry across Kenya. Cost depends on destination county and total weight. Exact drop-off details are collected at checkout.</p>
              <div className="card space-y-3 p-4">
                <label className="label" htmlFor="county">Delivery county</label>
                <select id="county" className="input" value={county} onChange={(e) => setCounty(e.target.value)}>
                  {COUNTIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {est && variant && (
                  <div className="flex items-start gap-3 rounded-lg bg-bg p-3">
                    <Truck className="mt-0.5 text-primary" size={20} />
                    <div className="text-sm">
                      <p><b>{formatKsh(est.fee)}</b> estimated transport for {qty} × {variant.label}</p>
                      <p className="text-muted">Load: {(Number(variant.weight_kg) * qty).toLocaleString()} kg · {est.lorry}</p>
                      <p className="mt-1 text-xs text-muted">Estimate only; the final fee is confirmed at checkout.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === "Reviews" && <Reviews productId={product.id} reviews={reviews} />}
        </div>
      </div>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 p-3 backdrop-blur md:hidden">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="truncate font-semibold">{variant?.label}</span>
          <span className="font-extrabold text-primary">{variant ? formatKsh(Number(variant.price) * qty) : ""}</span>
        </div>
        <ActionButtons />
      </div>
    </div>
  );
}
