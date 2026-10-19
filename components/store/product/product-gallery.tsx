"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImageIcon, X, ZoomIn } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import { cn } from "@/lib/utils";

/**
 * Swipeable main photo (native scroll-snap — smooth on cheap phones), thumbnails,
 * and a full-screen lightbox. `index` is controlled so picking an option can
 * jump to that option's photo.
 */
export function ProductGallery({
  images,
  name,
  index,
  onIndexChange,
  badge,
}: {
  images: string[];
  name: string;
  index: number;
  onIndexChange: (index: number) => void;
  badge?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Keep the track in step when the index changes from outside (thumbs, options)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const target = index * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) > 4) track.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  function onScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== index) onIndexChange(i);
    }, 90);
  }

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-3xl bg-linear-to-br from-brand-50 to-brand-100 text-brand-800/30">
        <ImageIcon className="size-16" />
      </div>
    );
  }

  const go = (by: number) => onIndexChange(Math.min(images.length - 1, Math.max(0, index + by)));

  return (
    <div className="space-y-3">
      <div className="group relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-3xl bg-muted [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
          aria-roledescription="carousel"
          aria-label={`${name} photos`}
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative aspect-square w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Open photo ${i + 1} of ${images.length} full screen`}
            >
              <ProductImage
                src={src}
                alt={i === 0 ? name : `${name} — photo ${i + 1}`}
                fill
                preload={i === 0}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {badge && (
          <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-ghana-red px-3 py-1.5 text-sm font-bold text-paper shadow-soft">
            {badge}
          </span>
        )}
        <span className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-paper backdrop-blur">
          <ZoomIn className="size-3.5" />
          <span className="numeric">
            {index + 1} / {images.length}
          </span>
        </span>

        {images.length > 1 && (
          <>
            <ArrowButton side="left" disabled={index === 0} onClick={() => go(-1)} />
            <ArrowButton side="right" disabled={index === images.length - 1} onClick={() => go(1)} />
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl bg-muted transition sm:size-20",
                  i === index ? "ring-2 ring-ink ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100",
                )}
              >
                <ProductImage src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightbox !== null && (
        <Lightbox
          images={images}
          name={name}
          start={lightbox}
          onClose={(last) => {
            setLightbox(null);
            onIndexChange(last);
          }}
        />
      )}
    </div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow-soft backdrop-blur transition-opacity disabled:opacity-0 md:grid md:opacity-0 md:group-hover:opacity-100",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function Lightbox({
  images,
  name,
  start,
  onClose,
}: {
  images: string[];
  name: string;
  start: number;
  onClose: (lastIndex: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(start);
  // Where the zoom was tapped, as fractions of the photo (null = not zoomed)
  const [zoomed, setZoomed] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = start * track.clientWidth;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [start]);

  function goTo(i: number) {
    const next = Math.min(images.length - 1, Math.max(0, i));
    setZoomed(null);
    setIndex(next);
    trackRef.current?.scrollTo({ left: next * trackRef.current.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(index);
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} className="fixed inset-0 z-[60] flex flex-col bg-ink/95 text-paper">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="numeric text-sm text-paper/70">
          {index + 1} / {images.length}
        </span>
        <span className="hidden text-xs text-paper/50 sm:block">{zoomed ? "Drag to look around · tap to zoom out" : "Tap the photo to zoom"}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={() => onClose(index)}
          className="grid size-11 place-items-center rounded-full bg-paper/10 hover:bg-paper/20"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        ref={trackRef}
        onScroll={(e) => {
          if (zoomed) return;
          const t = e.currentTarget;
          const i = Math.round(t.scrollLeft / t.clientWidth);
          if (i !== index) setIndex(i);
        }}
        className={cn(
          "flex min-h-0 flex-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden",
          zoomed ? "overflow-hidden" : "overflow-x-auto",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center">
            {zoomed && i === index ? (
              <ZoomedImage src={src} alt={name} at={zoomed} onZoomOut={() => setZoomed(null)} />
            ) : (
              <button
                type="button"
                className="relative block size-full cursor-zoom-in"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  // Keyboard clicks have no position: zoom into the middle
                  const x = e.clientX ? (e.clientX - r.left) / r.width : 0.5;
                  const y = e.clientY ? (e.clientY - r.top) / r.height : 0.5;
                  setZoomed({ x, y });
                }}
                aria-label="Zoom in"
              >
                <ProductImage src={src} alt={`${name} — photo ${i + 1}`} fill sizes="100vw" className="object-contain" />
              </button>
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-4">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1}`}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand-400" : "w-1.5 bg-paper/40")}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

/** 2.5× zoom you pan by dragging/scrolling; opens centred on where you tapped. */
function ZoomedImage({
  src,
  alt,
  at,
  onZoomOut,
}: {
  src: string;
  alt: string;
  at: { x: number; y: number };
  onZoomOut: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ left: at.x * el.scrollWidth - el.clientWidth / 2, top: at.y * el.scrollHeight - el.clientHeight / 2 });
  }, [at]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-auto overscroll-contain" style={{ scrollbarWidth: "none" }}>
      <button type="button" onClick={onZoomOut} className="relative block h-[250%] w-[250%] cursor-zoom-out" aria-label="Zoom out">
        <ProductImage src={src} alt={alt} fill sizes="250vw" className="object-contain" />
      </button>
    </div>
  );
}
