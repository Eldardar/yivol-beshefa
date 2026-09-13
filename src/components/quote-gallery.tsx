"use client";
import { useEffect, useState } from "react";

export type Quote = { text: string; cite: string; dir?: "ltr" | "rtl" };

const AUTO_ADVANCE_MS = 2000;

export function QuoteGallery({ quotes }: { quotes: Quote[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [quotes.length]);

  if (quotes.length === 0) return null;

  return (
    <div className="quote-gallery">
      <div className="quote-gallery-viewport">
        <div className="quote-gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {quotes.map((quote, i) => (
            <blockquote key={i} className="auth-side-quote quote-gallery-slide" dir={quote.dir ?? "ltr"}>
              <p>&ldquo;{quote.text}&rdquo;</p>
              <cite>~ {quote.cite}</cite>
            </blockquote>
          ))}
        </div>
      </div>
      {quotes.length > 1 && (
        <div className="quote-gallery-dots">
          {quotes.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`quote-gallery-dot${i === index ? " active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`ציטוט ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
