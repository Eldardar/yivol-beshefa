"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { jerusalemDate } from "@/lib/dates";

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

function renderNavItem({
  itemKey,
  y,
  m,
  className,
  ariaLabel,
  role,
  ariaSelected,
  children,
  basePath,
  onChange,
  onNavigate
}: {
  itemKey?: string | number;
  y: number;
  m: number;
  className: string;
  ariaLabel?: string;
  role?: string;
  ariaSelected?: boolean;
  children: React.ReactNode;
  basePath: string;
  onChange?: (year: number, month: number) => void;
  onNavigate: () => void;
}) {
  if (onChange) {
    return (
      <button
        key={itemKey}
        type="button"
        className={className}
        aria-label={ariaLabel}
        role={role}
        aria-selected={ariaSelected}
        onClick={() => { onChange(y, m); onNavigate(); }}
      >
        {children}
      </button>
    );
  }
  return (
    <Link key={itemKey} href={monthHref(basePath, y, m)} className={className} aria-label={ariaLabel} role={role} aria-selected={ariaSelected} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function CalendarMonthNav({
  year,
  month,
  basePath = "/calendar",
  onChange
}: {
  year: number;
  month: number;
  basePath?: string;
  onChange?: (year: number, month: number) => void;
}) {
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
  const today = jerusalemDate();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const isCurrentMonth = year === todayYear && month === todayMonth;

  const navItem = (props: Omit<Parameters<typeof renderNavItem>[0], "basePath" | "onChange" | "onNavigate">) =>
    renderNavItem({ ...props, basePath, onChange, onNavigate: () => setOpen(null) });

  const navOption = (itemKey: string | number, itemY: number, itemM: number, isSelected: boolean, label: React.ReactNode) =>
    navItem({ itemKey, y: itemY, m: itemM, className: `calendar-nav-option${isSelected ? " is-selected" : ""}`, role: "option", ariaSelected: isSelected, children: label });

  return (
    <div className="calendar-nav" ref={rootRef}>
      {navItem({ y: prev.year, m: prev.month, className: "calendar-nav-arrow", ariaLabel: "חודש קודם", children: <ArrowRightIcon size={18} /> })}
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
              {HEBREW_MONTHS.map((name, i) => navOption(name, year, i + 1, i + 1 === month, name))}
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
              {years.map(y => navOption(y, y, month, y === year, y))}
            </div>
          )}
        </div>
      </div>
      {navItem({ y: next.year, m: next.month, className: "calendar-nav-arrow", ariaLabel: "חודש הבא", children: <ArrowLeftIcon size={18} /> })}
      {!isCurrentMonth &&
        navItem({ y: todayYear, m: todayMonth, className: "calendar-nav-today", children: "היום" })}
    </div>
  );
}
