import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatKsh = (n: number) =>
  "KSh " + Math.round(n).toLocaleString("en-KE");

/** Normalise Kenyan phone numbers to 2547XXXXXXXX / 2541XXXXXXXX. Returns null if invalid. */
export function normalizeKePhone(input: string): string | null {
  const d = input.replace(/[^\d]/g, "");
  let n: string;
  if (d.startsWith("254")) n = d;
  else if (d.startsWith("0")) n = "254" + d.slice(1);
  else if (d.length === 9) n = "254" + d;
  else return null;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function whatsappLink(message: string, number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productWhatsappMessage(name: string, variant: string, price: number, url: string) {
  return `Hi, I am interested in ${name} (${variant}) listed at KSh ${Math.round(price).toLocaleString("en-KE")}. Link: ${url}`;
}
