"use client";
import dynamic from "next/dynamic";

/** Leaflet touches `window`, so it is client-only. */
export const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-surface" />,
});
