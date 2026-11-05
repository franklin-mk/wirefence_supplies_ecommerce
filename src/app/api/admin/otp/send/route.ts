import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { requireUser } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/admin-session";
import { sendMail, otpEmail } from "@/lib/email";

/**
 * Step 2 of admin login. The browser has already signed in with email + password;
 * this issues a 6-digit code to that admin's email. Called on EVERY login attempt.
 */
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  // Same response for non-admins so the endpoint does not reveal who is an admin.
  if (profile?.role !== "admin") return NextResponse.json({ ok: true });

  const db = createAdminClient();

  // Throttle: max 5 codes per 15 minutes.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db
    .from("admin_otps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .gte("created_at", since);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Too many codes requested. Try again later." },
      { status: 429 }
    );
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const ttl = Number(process.env.ADMIN_OTP_TTL_MINUTES ?? 10);

  // Invalidate previous unexpired codes for this user
  await db
    .from("admin_otps")
    .update({ used: true })
    .eq("user_id", auth.user.id)
    .eq("used", false);

  // Store hashed OTP
  await db.from("admin_otps").insert({
    user_id: auth.user.id,
    code_hash: await sha256Hex(`${auth.user.id}:${code}`),
    expires_at: new Date(Date.now() + ttl * 60_000).toISOString(),
  });

  // Dispatch secure email
  try {
    await sendMail({
      to: auth.user.email!,
      subject: "Your WireFence Admin Sign-In Code",
      html: otpEmail(code, ttl),
    });
  } catch (err) {
    console.error("Failed to send admin OTP email:", err);
    return NextResponse.json(
      { error: "Failed to deliver OTP email. Check email provider credentials." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}