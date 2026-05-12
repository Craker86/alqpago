"use client";

import { useState, useRef, useEffect } from "react";
import { Building2 } from "lucide-react";

/**
 * Carrusel horizontal con scroll-snap + indicadores de puntos.
 * Acepta una lista de URLs de fotos y un aspect ratio opcional.
 */
export default function PhotoCarousel({
  fotos = [],
  alt = "Foto",
  aspect = "aspect-[4/3]",
  rounded = "rounded-card",
  onPhotoClick,
}) {
  const ref = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onScroll() {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(idx);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!fotos || fotos.length === 0) {
    return (
      <div className={`${aspect} ${rounded} bg-brand-50 flex items-center justify-center overflow-hidden`}>
        <Building2 className="text-brand-300" size={48} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative ${aspect} ${rounded} overflow-hidden bg-fg/5`}>
      <div
        ref={ref}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {fotos.map((foto, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPhotoClick?.(foto, i)}
            className="snap-start flex-shrink-0 w-full h-full focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto}
              alt={`${alt} ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>

      {fotos.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {fotos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-pill transition-all ${
                i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
