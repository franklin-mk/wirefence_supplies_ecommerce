"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWishlist } from "@/store/wishlist";

/** On sign-in, merge the guest wishlist into the account wishlist. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sb = createClient();
    async function sync(userId: string) {
      const local = useWishlist.getState().ids;
      const { data } = await sb.from("wishlist_items").select("product_id").eq("user_id", userId);
      const remote = (data ?? []).map((r: { product_id: string }) => r.product_id);
      const missing = local.filter((id) => !remote.includes(id));
      if (missing.length) await sb.from("wishlist_items").upsert(missing.map((product_id) => ({ user_id: userId, product_id })));
      useWishlist.getState().setAll(Array.from(new Set([...remote, ...local])));
    }
    sb.auth.getUser().then(({ data }) => data.user && sync(data.user.id));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) sync(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <>{children}</>;
}
