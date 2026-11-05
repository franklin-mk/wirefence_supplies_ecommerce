"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Map } from "@/components/map-dynamic";
import { formatKsh, whatsappLink } from "@/lib/utils";

export function AdminOrderPanel({ order, location }: { order: any; location: { lat: number; lng: number; updated_at: string } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [driverName, setDriverName] = useState(order.driver_name ?? "");
  const [driverPhone, setDriverPhone] = useState(order.driver_phone ?? "");
  const [trackerUrl, setTrackerUrl] = useState("");

  async function act(body: object) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/admin/orders/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(j.error ?? "Action failed"); return null; }
    router.refresh();
    return j;
  }

  const unpaid = ["PENDING_PAYMENT", "FAILED"].includes(order.status);
  const dest = order.drop_lat && order.drop_lng ? { lat: order.drop_lat, lng: order.drop_lng } : null;

  async function dispatch(e: React.FormEvent) {
    e.preventDefault();
    const j = await act({ action: "dispatch", driverName, driverPhone });
    if (j?.trackerUrl) setTrackerUrl(j.trackerUrl);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">{order.order_number}</h1><StatusBadge status={order.status} /></div>
      {msg && <p className="card border-danger p-3 text-sm text-danger">{msg}</p>}

      <section className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <div><p className="label">Customer</p><p className="font-semibold">{order.full_name}</p><p>Phone {order.phone}</p>
          <a className="inline-flex items-center gap-1 font-semibold text-primary" href={whatsappLink(`Hi ${order.full_name}, regarding your order ${order.order_number}.`, order.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp {order.whatsapp}</a></div>
        <div><p className="label">Deliver to</p><p className="font-semibold">{order.drop_off_point}</p><p>{order.sub_county}, {order.county}</p>
          {dest && <a className="font-semibold text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${dest.lat},${dest.lng}`}>Open drop pin</a>}</div>
        {order.transport_notes && <div className="sm:col-span-2"><p className="label">Transport instructions</p><p>{order.transport_notes}</p></div>}
      </section>

      <section className="card space-y-1 p-4 text-sm">
        {order.order_items.map((i: any) => <div key={i.id} className="flex justify-between"><span>{i.qty} × {i.product_name} <span className="text-muted">({i.variant_label})</span></span><span>{formatKsh(Number(i.unit_price) * i.qty)}</span></div>)}
        <div className="flex justify-between border-t border-border pt-1"><span className="text-muted">Transport</span><span>{formatKsh(Number(order.transport_fee))}</span></div>
        <div className="flex justify-between font-extrabold"><span>Total</span><span>{formatKsh(Number(order.total))}</span></div>
        {order.mpesa_receipt && <p className="text-xs text-muted">M-Pesa receipt {order.mpesa_receipt}</p>}
        {order.manual_payment_note && <p className="text-xs text-muted">Manual payment: {order.manual_payment_note}</p>}
      </section>

      {unpaid && (
        <section className="card space-y-2 p-4">
          <p className="font-bold">Confirm manual payment</p>
          <p className="text-xs text-muted">Use when the customer paid outside STK (e.g. direct Paybill/Till or cash). Reduces stock and emails the receipt.</p>
          <input className="input" placeholder="Reference, e.g. M-Pesa code SJK12ABC9" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary" disabled={busy || note.length < 3} onClick={() => confirm("Mark this order as paid?") && act({ action: "confirm_manual_payment", note })}>Mark as paid</button>
        </section>
      )}

      {!unpaid && order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
        <section className="card space-y-3 p-4">
          <p className="font-bold">Fulfilment</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline !py-2" disabled={busy} onClick={() => act({ action: "set_status", status: "PROCESSING", note: "Processing & loading" })}>Processing & loading</button>
            <button className="btn-outline !py-2" disabled={busy} onClick={() => act({ action: "set_status", status: "DELIVERED", note: "Delivered" })}>Mark delivered</button>
            <button className="btn-outline !border-danger !py-2 !text-danger" disabled={busy} onClick={() => confirm("Cancel this order?") && act({ action: "set_status", status: "CANCELLED" })}>Cancel</button>
            <button className="btn-ghost !py-2" disabled={busy} onClick={() => act({ action: "resend_receipt" }).then((j) => j && setMsg("Receipt re-sent."))}>Resend receipt</button>
          </div>

          <form onSubmit={dispatch} className="space-y-2 border-t border-border pt-3">
            <p className="font-bold">Assign driver & dispatch</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" required placeholder="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              <input className="input" required placeholder="Driver phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={busy}>Dispatch & generate tracker link</button>
          </form>

          {trackerUrl && (
            <div className="rounded-lg bg-bg p-3 text-sm">
              <p className="font-semibold">Send this link to the driver (valid 3 days):</p>
              <p className="break-all font-mono text-xs">{trackerUrl}</p>
              <div className="mt-2 flex gap-3">
                <button className="flex items-center gap-1 font-semibold text-primary" onClick={() => navigator.clipboard.writeText(trackerUrl)}><Copy size={14} /> Copy</button>
                <a className="flex items-center gap-1 font-semibold text-primary" target="_blank" rel="noreferrer" href={`https://wa.me/${driverPhone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Delivery ${order.order_number}. Open this link and tap Start sharing: ${trackerUrl}`)}`}><MessageCircle size={14} /> Send via WhatsApp</a>
              </div>
            </div>
          )}
        </section>
      )}

      {order.status === "IN_TRANSIT" && (
        <section className="card space-y-2 p-4">
          <p className="font-bold">Live location {order.driver_name ? `· ${order.driver_name}` : ""}</p>
          {location ? <><Map truck={location} pin={dest} height={320} /><p className="text-xs text-muted">Updated {new Date(location.updated_at).toLocaleTimeString("en-KE")}. Refresh to update.</p></> : <p className="text-sm text-muted">Driver has not started sharing yet.</p>}
        </section>
      )}
    </div>
  );
}
