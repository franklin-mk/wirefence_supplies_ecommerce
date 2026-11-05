import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/admin-session";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session cookie if needed.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = req.nextUrl.pathname;

  // Checkout requires an account (and only checkout).
  if (path.startsWith("/checkout") && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/checkout");
    return NextResponse.redirect(url);
  }
  if ((path.startsWith("/account") || path.startsWith("/orders")) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Admin area: signed in + OTP-verified cookie (role is re-checked in the admin layout / API guards).
  const isAdminPage = path.startsWith("/admin") && !path.startsWith("/admin/login");
  if (isAdminPage) {
    const ok = user && (await verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value, user.id));
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
