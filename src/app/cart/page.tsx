"use client";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCart, cartSubtotal, cartWeight } from "@/store/cart";
import { useHydrated } from "@/hooks/use-hydrated";
import { COUNTIES, estimateTransport } from "@/lib/transport";
import { cldUrl } from "@/lib/cld-url";
import { formatKsh } from "@/lib/utils";

export default function CartPage() {
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();
  const [county, setCounty] = useState("Nairobi");

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!lines.length)
    return (
      <div className="card p-10 text-center">
        <p className="mb-4 text-lg font-bold">Your cart is empty</p>
        <Link href="/" className="btn-primary">Browse products</Link>
      </div>
    );

  const subtotal = cartSubtotal(lines);
  const weight = cartWeight(lines);
  const est = estimateTransport(county, weight);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        {lines.map((l) => (
          <div key={l.variantId} className="card flex gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cldUrl(l.image, 200)} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <div className="flex-1">
              <Link href={`/products/${l.slug}?variant=${l.variantId}`} className="font-bold hover:text-primary">{l.name}</Link>
              <p className="text-sm text-muted">{l.variantLabel} · {l.weightKg} kg</p>
              <p className="font-extrabold text-primary">{formatKsh(l.price)}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="inline-flex items-center rounded-lg border border-border">
                  <button className="px-2.5 py-1.5" onClick={() => setQty(l.variantId, l.qty - 1)} aria-label="Decrease"><Minus size={14} /></button>
                  <span className="w-10 text-center text-sm font-bold">{l.qty}</span>
                  <button className="px-2.5 py-1.5" onClick={() => setQty(l.variantId, l.qty + 1)} aria-label="Increase"><Plus size={14} /></button>
                </div>
                <button onClick={() => remove(l.variantId)} className="text-danger" aria-label="Remove"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="card h-fit space-y-3 p-4 lg:sticky lg:top-24">
        <h2 className="font-extrabold">Order summary</h2>
        <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-semibold">{formatKsh(subtotal)}</span></div>
        <div>
          <label className="label" htmlFor="c">Delivery county</label>
          <select id="c" className="input" value={county} onChange={(e) => setCounty(e.target.value)}>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex justify-between text-sm"><span className="flex items-center gap-1 text-muted"><Truck size={14} /> Transport (est.)</span><span className="font-semibold">{formatKsh(est.fee)}</span></div>
        <p className="text-xs text-muted">{weight.toLocaleString()} kg · {est.lorry}</p>
        <div className="flex justify-between border-t border-border pt-3 text-lg font-extrabold"><span>Total</span><span className="text-primary">{formatKsh(subtotal + est.fee)}</span></div>
        <Link href="/checkout" className="btn-primary w-full">Proceed to checkout</Link>
        <p className="text-center text-xs text-muted">You will be asked to sign in or create an account at checkout.</p>
      </aside>
    </div>
  );
}
