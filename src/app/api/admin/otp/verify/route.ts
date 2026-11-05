//src/app/api/admin/otp/verify/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, sessionDays, sha256Hex, signAdminCookie } from "@/lib/admin-session";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { code } = await req.json();
  if (typeof code !== "string" || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const { data: profile } = await auth.supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });

  const db = createAdminClient();
  const { data: otp } = await db
    .from("admin_otps").select("*")
    .eq("user_id", auth.user.id).eq("used", false)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!otp || new Date(otp.expires_at) < new Date() || otp.attempts >= 5)
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });

  if (otp.code_hash !== (await sha256Hex(`${auth.user.id}:${code}`))) {
    await db.from("admin_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  await db.from("admin_otps").update({ used: true }).eq("id", otp.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await signAdminCookie(auth.user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDays() * 86400,
  });
  return res;
}
