"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { useCart, cartSubtotal, cartWeight } from "@/store/cart";
import { useHydrated } from "@/hooks/use-hydrated";
import { createClient } from "@/lib/supabase/client";
import { COUNTIES, estimateTransport } from "@/lib/transport";
import { formatKsh } from "@/lib/utils";
import { Map } from "@/components/map-dynamic";

type Pin = { lat: number; lng: number } | null;

export function CheckoutForm({ email, verified, defaultName }: { email: string; verified: boolean; defaultName: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines, clear } = useCart();
  const [f, setF] = useState({
    fullName: defaultName, phone: "", whatsapp: "", sameWa: true, county: "Nairobi", subCounty: "", dropOffPoint: "", transportNotes: "", mpesaPhone: "",
  });
  const [pin, setPin] = useState<Pin>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!lines.length)
    return <div className="card p-8 text-center">Your cart is empty. <Link href="/" className="font-bold text-primary">Continue shopping</Link></div>;

  const subtotal = cartSubtotal(lines);
  const est = estimateTransport(f.county, cartWeight(lines));

  function locate() {
    if (!navigator.geolocation) return setError("Geolocation is not supported on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => setPin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Could not get your location. Tap the map to drop a pin instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function resend() {
    await createClient().auth.resend({ type: "signup", email });
    setResent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          fullName: f.fullName, phone: f.phone, whatsapp: f.sameWa ? f.phone : f.whatsapp,
          county: f.county, subCounty: f.subCounty, dropOffPoint: f.dropOffPoint,
          dropLat: pin?.lat ?? null, dropLng: pin?.lng ?? null,
          transportNotes: f.transportNotes || undefined, mpesaPhone: f.mpesaPhone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok && !json.orderId) throw new Error(json.error ?? "Checkout failed");
      clear(); // order exists server-side; payment can be retried from the order page
      router.push(`/orders/${json.orderId}${json.stkSent ? "?stk=1" : "?stk=0"}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold">Checkout</h1>

        {!verified && (
          <div className="card border-accent p-4 text-sm">
            <p className="font-bold">Verify your email to place an order</p>
            <p className="text-muted">We sent a link to {email}. Orders are only processed after verification. Refresh this page once verified.</p>
            <button type="button" onClick={resend} className="mt-2 font-semibold text-primary underline">{resent ? "Link sent ✓" : "Resend verification email"}</button>
          </div>
        )}

        <section className="card space-y-3 p-4">
          <h2 className="font-bold">Contact</h2>
          <div><label className="label">Full name</label><input className="input" required value={f.fullName} onChange={(e) => set("fullName", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Primary phone</label><input className="input" required inputMode="tel" placeholder="0712 345 678" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><label className="label">WhatsApp number</label><input className="input" required={!f.sameWa} disabled={f.sameWa} inputMode="tel" value={f.sameWa ? f.phone : f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.sameWa} onChange={(e) => set("sameWa", e.target.checked)} /> WhatsApp is the same as my phone</label>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-bold">Delivery (lorry drop-off)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">County</label><select className="input" value={f.county} onChange={(e) => set("county", e.target.value)}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label">Sub-county / Town</label><input className="input" required value={f.subCounty} onChange={(e) => set("subCounty", e.target.value)} /></div>
          </div>
          <div><label className="label">Exact drop-off point</label><input className="input" required placeholder="e.g. Gate of Mwangi farm, 2 km past Karatina market" value={f.dropOffPoint} onChange={(e) => set("dropOffPoint", e.target.value)} /></div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label !mb-0">GPS drop pin (optional but recommended)</label>
              <button type="button" onClick={locate} className="flex items-center gap-1 text-sm font-semibold text-primary"><LocateFixed size={16} /> Use my location</button>
            </div>
            <Map pin={pin} onPick={setPin} height={260} />
            <p className="mt-1 text-xs text-muted">{pin ? `Pin set: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : "Tap the map to drop a pin at the exact offloading spot."}</p>
          </div>
          <div><label className="label">Transport instructions</label><textarea className="input min-h-20" maxLength={600} placeholder="Road condition, narrow bridges, gate width, who receives, offloading help…" value={f.transportNotes} onChange={(e) => set("transportNotes", e.target.value)} /></div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-bold">M-Pesa payment</h2>
          <div><label className="label">M-Pesa number (defaults to your phone)</label><input className="input" inputMode="tel" placeholder={f.phone || "0712 345 678"} value={f.mpesaPhone} onChange={(e) => set("mpesaPhone", e.target.value)} /></div>
          <p className="text-xs text-muted">You will get an STK prompt on this number to enter your M-Pesa PIN.</p>
        </section>
      </div>

      <aside className="card h-fit space-y-2 p-4 lg:sticky lg:top-24">
        <h2 className="font-extrabold">Summary</h2>
        {lines.map((l) => (
          <div key={l.variantId} className="flex justify-between gap-2 text-sm"><span>{l.qty} × {l.name} <span className="text-muted">({l.variantLabel})</span></span><span>{formatKsh(l.qty * l.price)}</span></div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-sm"><span className="text-muted">Subtotal</span><span>{formatKsh(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Transport ({est.lorry})</span><span>{formatKsh(est.fee)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-extrabold"><span>Total</span><span className="text-primary">{formatKsh(subtotal + est.fee)}</span></div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !verified}>{busy ? "Sending M-Pesa prompt…" : "Pay with M-Pesa"}</button>
        <p className="text-xs text-muted">Prices and stock are re-checked on our server. The transport fee shown is final.</p>
      </aside>
    </form>
  );
}
