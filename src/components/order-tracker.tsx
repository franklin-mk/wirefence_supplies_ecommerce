"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Truck } from "lucide-react";
import type { OrderStatus } from "@/lib/types";
import { Map } from "@/components/map-dynamic";
import { StatusBadge } from "@/components/status-badge";
import { formatKsh } from "@/lib/utils";

type Item = { id: string; product_name: string; variant_label: string; qty: number; unit_price: number };
type Initial = {
  id: string; order_number: string; status: OrderStatus; total: number; transport_fee: number; subtotal: number;
  county: string; sub_county: string; drop_off_point: string; drop_lat: number | null; drop_lng: number | null;
  driver_name: string | null; mpesa_receipt: string | null; phone: string; order_items: Item[];
};
type Event = { status: OrderStatus; note: string | null; created_at: string };
type Loc = { lat: number; lng: number; updated_at: string } | null;

const STEPS = [
  { key: "Order Received", statuses: ["PAID"] },
  { key: "Processing & Loading", statuses: ["PROCESSING"] },
  { key: "In Transit", statuses: ["IN_TRANSIT"] },
  { key: "Delivered", statuses: ["DELIVERED"] },
];

function stepIndex(status: OrderStatus) {
  return STEPS.findIndex((s) => s.statuses.includes(status));
}

export function OrderTracker({ initial, stkSent }: { initial: Initial; stkSent: boolean }) {
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [events, setEvents] = useState<Event[]>([]);
  const [loc, setLoc] = useState<Loc>(null);
  const [driver, setDriver] = useState(initial.driver_name);
  const [retryMsg, setRetryMsg] = useState("");
  const [retryPhone, setRetryPhone] = useState(initial.phone);
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async () => {
    const r = await fetch(`/api/orders/${initial.id}/track`, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setStatus(j.order.status);
    setDriver(j.order.driver_name);
    setEvents(j.events);
    setLoc(j.location);
  }, [initial.id]);

  useEffect(() => {
    poll();
    // Fast while payment or delivery is in flight, slow otherwise.
    const ms = ["PENDING_PAYMENT", "IN_TRANSIT"].includes(status) ? 5000 : 20000;
    if (status === "DELIVERED" || status === "CANCELLED") return;
    const t = setInterval(poll, ms);
    return () => clearInterval(t);
  }, [poll, status]);

  async function retry() {
    setBusy(true);
    setRetryMsg("");
    const r = await fetch("/api/mpesa/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: initial.id, mpesaPhone: retryPhone }) });
    const j = await r.json();
    setBusy(false);
    setRetryMsg(r.ok ? "M-Pesa prompt sent. Check your phone." : j.error ?? "Could not send prompt");
    poll();
  }

  const unpaid = status === "PENDING_PAYMENT" || status === "FAILED";
  const idx = stepIndex(status);
  const dest = initial.drop_lat && initial.drop_lng ? { lat: initial.drop_lat, lng: initial.drop_lng } : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Order {initial.order_number}</h1>
          <p className="text-sm text-muted">{initial.drop_off_point}, {initial.sub_county}, {initial.county}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {unpaid && (
        <div className="card space-y-3 border-accent p-4">
          <p className="font-bold">{status === "FAILED" ? "Payment did not go through" : "Waiting for M-Pesa payment"}</p>
          <p className="text-sm text-muted">
            {status === "PENDING_PAYMENT" && stkSent ? "Enter your M-Pesa PIN on the prompt we sent to your phone. This page updates automatically." : "Send a new prompt to complete your order."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input" value={retryPhone} onChange={(e) => setRetryPhone(e.target.value)} inputMode="tel" aria-label="M-Pesa phone" />
            <button onClick={retry} disabled={busy} className="btn-primary whitespace-nowrap">{busy ? "Sending…" : "Resend M-Pesa prompt"}</button>
          </div>
          {retryMsg && <p className="text-sm">{retryMsg}</p>}
        </div>
      )}

      {!unpaid && status !== "CANCELLED" && (
        <ol className="card space-y-0 p-4">
          {STEPS.map((s, i) => {
            const done = i <= idx;
            const current = i === idx;
            const ev = events.filter((e) => s.statuses.includes(e.status)).at(-1);
            return (
              <li key={s.key} className="relative flex gap-3 pb-6 last:pb-0">
                {i < STEPS.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < idx ? "bg-primary" : "bg-border"}`} />}
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-primary bg-primary text-primary-fg" : "border-border bg-bg text-muted"} ${current ? "ring-4 ring-primary/20" : ""}`}>
                  {done ? <Check size={16} /> : i + 1}
                </span>
                <div>
                  <p className={`font-bold ${done ? "" : "text-muted"}`}>{s.key}</p>
                  {ev && <p className="text-xs text-muted">{new Date(ev.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}{ev.note ? ` · ${ev.note}` : ""}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {status === "IN_TRANSIT" && (
        <div className="card space-y-2 p-4">
          <p className="flex items-center gap-2 font-bold"><Truck size={18} className="text-primary" /> Live lorry location{driver ? ` · Driver: ${driver}` : ""}</p>
          {loc ? (
            <>
              <Map truck={loc} pin={dest} height={340} />
              <p className="text-xs text-muted">Last update {new Date(loc.updated_at).toLocaleTimeString("en-KE")}</p>
            </>
          ) : (
            <p className="text-sm text-muted">The driver has not started sharing location yet. It will appear here as soon as they do.</p>
          )}
        </div>
      )}

      <div className="card space-y-2 p-4 text-sm">
        <p className="font-bold">Items</p>
        {initial.order_items.map((i) => (
          <div key={i.id} className="flex justify-between"><span>{i.qty} × {i.product_name} <span className="text-muted">({i.variant_label})</span></span><span>{formatKsh(Number(i.unit_price) * i.qty)}</span></div>
        ))}
        <div className="flex justify-between border-t border-border pt-2"><span className="text-muted">Transport</span><span>{formatKsh(Number(initial.transport_fee))}</span></div>
        <div className="flex justify-between font-extrabold"><span>Total</span><span className="text-primary">{formatKsh(Number(initial.total))}</span></div>
        {initial.mpesa_receipt && <p className="text-xs text-muted">M-Pesa receipt: {initial.mpesa_receipt}</p>}
      </div>
    </div>
  );
}
