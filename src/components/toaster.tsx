"use client";
import { useSyncExternalStore } from "react";
import { XIcon } from "./icons";

// Short-lived feedback after an in-place save ("saved", warnings, errors outside a modal).
// Saves no longer reload the page, so the ?saved=1 banners at the top would be out of view.

export type ToastVariant = "success" | "warning" | "error";
type Toast = { id: number; variant: ToastVariant; message: string };

const DURATION_MS = { success: 3500, warning: 7000, error: 7000 } satisfies Record<ToastVariant, number>;

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const noToasts: Toast[] = [];

function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

export function toast(message: string, variant: ToastVariant = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, variant, message }];
  emit();
  window.setTimeout(() => dismiss(id), DURATION_MS[variant]);
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts, () => noToasts);
  if (list.length === 0) return null;
  return (
    <div className="toaster" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={`alert alert-dismissible toast${t.variant === "warning" ? " alert-warn" : ""}`} role={t.variant === "error" ? "alert" : "status"}>
          <span>{t.message}</span>
          <button type="button" className="alert-close" aria-label="סגירת ההודעה" onClick={() => dismiss(t.id)}><XIcon size={18} /></button>
        </div>
      ))}
    </div>
  );
}
