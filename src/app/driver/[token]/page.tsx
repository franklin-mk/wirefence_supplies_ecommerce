"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Square } from "lucide-react";

type Info = { order_number: string; county: string; sub_county: string; drop_off_point: string };

/** Opened by the lorry driver from the link the admin sends. No login: the long random token is the credential. */
export default function DriverPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("Not sharing");
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/driver/${params.token}`).then(async (r) => {
      if (!r.ok) return setInvalid(true);
      setInfo((await r.json()).order);
    });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  const send = useCallback(async (pos: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastSent.current < 5000) return; // throttle to one fix per 5 s
    lastSent.current = now;
    const r = await fetch(`/api/driver/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading, speed: pos.coords.speed }),
    });
    setStatus(r.ok ? `Last sent ${new Date().toLocaleTimeString("en-KE")}` : "Link expired or trip closed");
    if (!r.ok) stop();
  }, [params.token]);

  async function start() {
    if (!navigator.geolocation) return setStatus("This device has no GPS support.");
    setSharing(true);
    setStatus("Getting GPS fix…");
    watchId.current = navigator.geolocation.watchPosition(send, (e) => { setStatus(`GPS error: ${e.message}`); }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    try { wakeLock.current = await (navigator as any).wakeLock?.request("screen"); } catch {}
  }

  function stop() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    try { wakeLock.current?.release(); } catch {}
    setSharing(false);
  }

  if (invalid) return <div className="card mx-auto max-w-sm p-6 text-center"><p className="font-bold">This tracking link is invalid or has expired.</p><p className="text-sm text-muted">Ask the dispatcher for a new one.</p></div>;
  if (!info) return <div className="h-40 animate-pulse rounded-xl bg-surface" />;

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <h1 className="text-2xl font-extrabold">Delivery {info.order_number}</h1>
      <p className="flex items-center justify-center gap-1 text-sm text-muted"><MapPin size={14} /> {info.drop_off_point}, {info.sub_county}, {info.county}</p>
      <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full ${sharing ? "animate-pulse bg-success/20 text-success" : "bg-surface text-muted"}`}><Navigation size={48} /></div>
      <p className="text-sm font-semibold">{status}</p>
      {sharing ? (
        <button onClick={() => { stop(); setStatus("Stopped"); }} className="btn-outline w-full"><Square size={16} /> Stop sharing</button>
      ) : (
        <button onClick={start} className="btn-primary w-full">Start sharing my location</button>
      )}
      <p className="text-xs text-muted">Keep this page open and your screen on while driving. The customer sees your lorry live.</p>
    </div>
  );
}
