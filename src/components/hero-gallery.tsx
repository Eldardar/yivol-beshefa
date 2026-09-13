"use client";
import { useEffect, useState } from "react";

export type GalleryImage = { src: string; alt: string };

const AUTO_ADVANCE_MS = 3000;

export function HeroGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  function go(delta: number) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className="hero-gallery">
      <div className="hero-gallery-viewport">
        <div className="hero-gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {images.map((image) => (
            <img key={image.src} src={image.src} alt={image.alt} className="hero-gallery-image" />
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" className="hero-gallery-nav hero-gallery-nav-prev" onClick={() => go(1)} aria-label="התמונה הבאה">
              ‹
            </button>
            <button type="button" className="hero-gallery-nav hero-gallery-nav-next" onClick={() => go(-1)} aria-label="התמונה הקודמת">
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="hero-gallery-dots">
          {images.map((image, i) => (
            <button
              key={image.src}
              type="button"
              className={`hero-gallery-dot${i === index ? " active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`עבור לתמונה ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
