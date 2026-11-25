"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { XIcon } from "./icons";

const EXIT_MS = 420;

// באנר הודעה שניתן לסגור. מוצג כל עוד פרמטר ה-URL קיים; הסגירה מסירה אותו,
// כך שההודעה לא חוזרת ברענון ומופיעה שוב בשמירה הבאה.
// בסגירה הבאנר דוהה ומתכווץ, והתוכן שמתחתיו מחליק למעלה.
export function DismissibleAlert({ variant, param, children }: { variant: "success" | "warning" | "error"; param: string; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const visible = searchParams.has(param);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!visible) return null;

  function removeParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setClosing(false); // מוכן להופעה מחדש בשמירה הבאה
  }
  function close() {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return removeParam();
    setClosing(true);
    timer.current = window.setTimeout(removeParam, EXIT_MS);
  }

  const className = variant === "warning" ? "alert alert-warn alert-dismissible" : "alert alert-dismissible";
  return (
    <div className={`alert-shell${closing ? " is-closing" : ""}`}>
      <div className="alert-shell-inner">
        <div className={className} role={variant === "success" ? "status" : "alert"}>
          <span>{children}</span>
          <button type="button" className="alert-close" aria-label="סגירת ההודעה" onClick={close}><XIcon size={18} /></button>
        </div>
      </div>
    </div>
  );
}
