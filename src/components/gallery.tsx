"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cldUrl } from "@/lib/cld-url";

/** Scroll-snap swipe carousel + thumbnail strip + full-screen lightbox with pinch/click zoom. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : [""];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    const next = (i + list.length) % list.length;
    setIndex(next);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
  }

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % list.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + list.length) % list.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, list.length]);

  return (
    <div>
      <div className="relative">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-xl bg-surface">
          {list.map((src, i) => (
            <button key={i} type="button" onClick={() => { setLightbox(true); setZoom(false); }} className="relative aspect-square w-full shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldUrl(src, 900)} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"><ZoomIn size={12} /> Tap to zoom</span>
        {list.length > 1 && (
          <>
            <button onClick={() => go(index - 1)} aria-label="Previous image" className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-bg/90 p-2 shadow md:block"><ChevronLeft size={18} /></button>
            <button onClick={() => go(index + 1)} aria-label="Next image" className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-bg/90 p-2 shadow md:block"><ChevronRight size={18} /></button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden">
              {list.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />)}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {list.map((src, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Show image ${i + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-primary" : "border-transparent opacity-70"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldUrl(src, 150)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95" onClick={() => setLightbox(false)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Close" onClick={() => setLightbox(false)}><X size={28} /></button>
          {list.length > 1 && (
            <>
              <button className="absolute left-3 text-white" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + list.length) % list.length); }}><ChevronLeft size={36} /></button>
              <button className="absolute right-3 text-white" aria-label="Next" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % list.length); }}><ChevronRight size={36} /></button>
            </>
          )}
          <div className="max-h-full max-w-full overflow-auto" onClick={(e) => { e.stopPropagation(); setZoom(!zoom); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cldUrl(list[index], 1600)} alt={alt} className={zoom ? "max-w-none cursor-zoom-out" : "max-h-[90vh] max-w-[95vw] cursor-zoom-in object-contain"} style={zoom ? { width: "180vmin" } : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}
