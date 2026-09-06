"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

const HEBREW_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
// The app went live in 2026, so the year picker has no reason to offer earlier years.
const MIN_YEAR = 2026;
const YEAR_LIST_SIZE = 20;

function monthHref(basePath: string, year: number, month: number): string {
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}y=${year}&m=${month}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  const y = Math.floor(total / 12);
  return { year: y, month: total - y * 12 + 1 };
}

export function CalendarMonthNav({ year, month, basePath = "/calendar" }: { year: number; month: number; basePath?: string }) {
  const [open, setOpen] = useState<"month" | "year" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const listSize = Math.max(YEAR_LIST_SIZE, year - MIN_YEAR + 1);
  const years = Array.from({ length: listSize }, (_, i) => MIN_YEAR + i);

  return (
    <div className="calendar-nav" ref={rootRef}>
      <Link href={monthHref(basePath, prev.year, prev.month)} className="calendar-nav-arrow" aria-label="חודש קודם">
        <ArrowRightIcon size={18} />
      </Link>
      <div className="calendar-nav-pickers">
        <div className="calendar-nav-picker">
          <button
            type="button"
            className="calendar-nav-label"
            aria-haspopup="listbox"
            aria-expanded={open === "month"}
            onClick={() => setOpen(o => (o === "month" ? null : "month"))}
          >
            {HEBREW_MONTHS[month - 1]}
          </button>
          {open === "month" && (
            <div className="calendar-nav-panel calendar-nav-panel--months" role="listbox" aria-label="בחירת חודש">
              {HEBREW_MONTHS.map((name, i) => (
                <Link
                  key={name}
                  href={monthHref(basePath, year, i + 1)}
                  className={`calendar-nav-option${i + 1 === month ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={i + 1 === month}
                  onClick={() => setOpen(null)}
                >
                  {name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="calendar-nav-picker">
          <button
            type="button"
            className="calendar-nav-label"
            aria-haspopup="listbox"
            aria-expanded={open === "year"}
            onClick={() => setOpen(o => (o === "year" ? null : "year"))}
          >
            {year}
          </button>
          {open === "year" && (
            <div className="calendar-nav-panel calendar-nav-panel--years" role="listbox" aria-label="בחירת שנה">
              {years.map(y => (
                <Link
                  key={y}
                  href={monthHref(basePath, y, month)}
                  className={`calendar-nav-option${y === year ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={y === year}
                  onClick={() => setOpen(null)}
                >
                  {y}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Link href={monthHref(basePath, next.year, next.month)} className="calendar-nav-arrow" aria-label="חודש הבא">
        <ArrowLeftIcon size={18} />
      </Link>
    </div>
  );
}
