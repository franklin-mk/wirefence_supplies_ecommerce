"use client";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

/** Persistent bottom-right WhatsApp button. Sits above the sticky action bar on product pages (mobile). */
export function WhatsAppFab() {
  const path = usePathname();
  const lift = path.startsWith("/products/") ? "bottom-24 md:bottom-6" : "bottom-5";
  return (
    <a
      href={whatsappLink("Hi, I would like to enquire about your fencing products.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 ${lift}`}
    >
      <MessageCircle size={28} />
    </a>
  );
}
