import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine public domain on Render reverse proxy
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

      let siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (!siteOrigin) {
        siteOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;
      }

      // Ensure origin doesn't end with a trailing slash
      siteOrigin = siteOrigin.replace(/\/$/, "");

      const target = next.startsWith("/") ? next : `/${next}`;
      return NextResponse.redirect(`${siteOrigin}${target}`);
    }
  }

  const fallbackOrigin = (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin).replace(/\/$/, "");
  return NextResponse.redirect(`${fallbackOrigin}/login?error=auth_failed`);
}