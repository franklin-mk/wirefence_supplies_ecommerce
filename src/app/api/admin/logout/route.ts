import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST() {
  await createClient().auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
