import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { Providers } from "@/components/providers";
import type { Category } from "@/lib/types";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? "WireFence Supplies";

export const metadata: Metadata = {
  title: { default: `${storeName} | Wire, mesh & fencing posts`, template: `%s | ${storeName}` },
  description: "Barbed wire, chain link, weld mesh, gate wire and fencing posts delivered across Kenya.",
  icons: {
    icon: "/images/barbed-wire_2294516.png",
    shortcut: "/images/barbed-wire_2294516.png",
    apple: "/images/barbed-wire_2294516.png",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const themeScript = `(function(){try{var s=localStorage.getItem('wf-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data } = await createClient().from("categories").select("*").order("sort_order");
  const categories = (data ?? []) as Category[];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-fg antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header categories={categories} storeName={storeName} />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:pb-10">
              {children}
            </main>
            <footer className="mt-auto border-t border-border bg-surface/30 py-6 text-center text-sm text-muted">
              © {new Date().getFullYear()} {storeName}. Delivery across Kenya by lorry.
            </footer>
            <WhatsAppFab />
          </div>
        </Providers>
      </body>
    </html>
  );
}