"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

type WishState = {
  ids: string[];
  toggle: (productId: string) => Promise<void>;
  setAll: (ids: string[]) => void;
};

/** Local for guests; mirrored to Supabase (wishlist_items) when signed in. */
export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      ids: [],
      setAll: (ids) => set({ ids }),
      toggle: async (productId) => {
        const had = get().ids.includes(productId);
        set({ ids: had ? get().ids.filter((i) => i !== productId) : [...get().ids, productId] }); // optimistic
        try {
          const sb = createClient();
          const { data } = await sb.auth.getUser();
          if (!data.user) return;
          if (had) await sb.from("wishlist_items").delete().eq("user_id", data.user.id).eq("product_id", productId);
          else await sb.from("wishlist_items").upsert({ user_id: data.user.id, product_id: productId });
        } catch {
          set({ ids: had ? [...get().ids, productId] : get().ids.filter((i) => i !== productId) });
        }
      },
    }),
    { name: "wf-wishlist" }
  )
);
