"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function passwordStep(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return setErr("Invalid email or password."); }
    const r = await fetch("/api/admin/otp/send", { method: "POST" });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error ?? "Could not send code.");
    setStep("otp");
  }

  async function otpStep(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (!r.ok) { setBusy(false); return setErr((await r.json()).error ?? "Invalid code."); }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">Admin sign in</h1>
      {step === "password" ? (
        <form onSubmit={passwordStep} className="space-y-3">
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : "Continue"}</button>
        </form>
      ) : (
        <form onSubmit={otpStep} className="space-y-3">
          <p className="text-sm text-muted">We emailed a 6-digit code to {email}.</p>
          <input className="input text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoFocus maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify & sign in"}</button>
          <button type="button" className="w-full text-sm text-muted underline" onClick={() => { setStep("password"); setCode(""); }}>Start over</button>
        </form>
      )}
    </div>
  );
}
