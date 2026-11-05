import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles email-verification links, OAuth returns and password-reset links. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(safe, url.origin));
}
