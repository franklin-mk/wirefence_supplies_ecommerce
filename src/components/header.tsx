"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart, cartCount } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/hooks/use-hydrated";

export function Header({ categories, storeName }: { categories: Category[]; storeName: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const wishCount = useWishlist((s) => s.ids.length);

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button className="btn-ghost !px-2 !py-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Link href="/" className="text-lg font-extrabold tracking-tight text-primary">
            {storeName}
          </Link>

          <form onSubmit={search} className="relative ml-4 hidden flex-1 md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search barbed wire, chain link, posts…" className="input pl-9" />
          </form>

          <nav className="ml-auto flex items-center gap-1">
            <div className="hidden md:block"><ThemeToggle /></div>
            <Link href="/wishlist" className="btn-ghost relative !px-3 !py-2" aria-label="Wishlist">
              <Heart size={20} />
              {hydrated && wishCount > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{wishCount}</span>}
            </Link>
            <Link href="/account" className="btn-ghost !px-3 !py-2" aria-label="Account"><User size={20} /></Link>
            <Link href="/cart" className="btn-ghost relative !px-3 !py-2" aria-label="Cart">
              <ShoppingCart size={20} />
              {hydrated && count > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-fg">{count}</span>}
            </Link>
          </nav>
        </div>

        {/* <div className="no-scrollbar mx-auto hidden max-w-7xl gap-5 overflow-x-auto px-4 pb-2 text-sm font-semibold md:flex">
          {categories.map((c) => (
            <Link key={c.id} href={`/?category=${c.slug}`} className="whitespace-nowrap text-muted hover:text-primary">{c.name}</Link>
          ))}
        </div> */}

        <form onSubmit={search} className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input pl-9" />
          </div>
        </form>
      </header>

      {/* Slide-out drawer (mobile) */}
      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute left-0 top-0 flex h-full w-72 flex-col bg-bg shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="font-extrabold text-primary">{storeName}</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu"><X size={22} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="label">Categories</p>
            <ul className="space-y-1">
              <li><Link onClick={() => setOpen(false)} href="/" className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-surface">All products</Link></li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link onClick={() => setOpen(false)} href={`/?category=${c.slug}`} className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-surface">{c.name}</Link>
                </li>
              ))}
            </ul>
            <p className="label mt-6">My account</p>
            <ul className="space-y-1">
              <li><Link onClick={() => setOpen(false)} href="/orders" className="block rounded-lg px-3 py-2.5 hover:bg-surface">My orders</Link></li>
              <li><Link onClick={() => setOpen(false)} href="/wishlist" className="block rounded-lg px-3 py-2.5 hover:bg-surface">Wishlist</Link></li>
              <li><Link onClick={() => setOpen(false)} href="/account" className="block rounded-lg px-3 py-2.5 hover:bg-surface">Sign in / Account</Link></li>
            </ul>
          </div>
          <div className="border-t border-border p-4"><ThemeToggle withLabel /></div>
        </aside>
      </div>
    </>
  );
}
