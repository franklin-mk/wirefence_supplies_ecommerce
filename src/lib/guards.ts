import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/admin-session";

/** For API routes: returns {user} or a ready-to-return error response. */
export async function requireUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) } as const;
  return { user: data.user, supabase } as const;
}

/** Admin = Supabase role 'admin' AND a valid OTP-verified cookie. */
export async function requireAdmin() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const cookieOk = await verifyAdminCookie(cookies().get(ADMIN_COOKIE)?.value, user.id);
  if (profile?.role !== "admin" || !cookieOk)
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;

  return { user, supabase } as const;
}
