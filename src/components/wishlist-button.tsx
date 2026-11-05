"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const hydrated = useHydrated();
  const active = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  const [pop, setPop] = useState(false);
  const on = hydrated && active;

  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPop(true);
        setTimeout(() => setPop(false), 400);
        toggle(productId);
      }}
      className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-bg/90 shadow ring-1 ring-border", className)}
    >
      <Heart size={18} className={cn(pop && "animate-heart", on ? "fill-danger text-danger" : "text-fg")} />
    </button>
  );
}
