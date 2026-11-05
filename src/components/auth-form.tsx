"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const target = safeNext(next);
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = createClient();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg({ type: "error", text: error.message });
      router.push(target);
      router.refresh();
    } else {
      const { data, error } = await sb.auth.signUp({
        email, password, options: { data: { full_name: name }, emailRedirectTo: callback() },
      });
      setBusy(false);
      if (error) return setMsg({ type: "error", text: error.message });
      if (data.session) { router.push(target); router.refresh(); }
      else setMsg({ type: "info", text: "Check your email and click the verification link to activate your account." });
    }
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  async function forgot() {
    if (!email) return setMsg({ type: "error", text: "Enter your email first." });
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/account` });
    setMsg(error ? { type: "error", text: error.message } : { type: "info", text: "Password reset link sent." });
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <div><label className="label">Full name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        )}
        <div><label className="label">Email</label><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {msg && <p className={`text-sm ${msg.type === "error" ? "text-danger" : "text-success"}`}>{msg.text}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <button onClick={google} className="btn-outline w-full">Continue with Google</button>
      <div className="flex justify-between text-sm">
        {mode === "login" ? (
          <>
            <Link className="font-semibold text-primary" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create account</Link>
            <button onClick={forgot} className="text-muted underline">Forgot password?</button>
          </>
        ) : (
          <Link className="font-semibold text-primary" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Already have an account?</Link>
        )}
      </div>
    </div>
  );
}
