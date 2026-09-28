"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { ExpenseForm } from "./expense-form";
import { PencilIcon, TrashIcon } from "./icons";
import type { ExpenseRow } from "@/lib/expenses";

export function expenseTitle(row: ExpenseRow): string {
  if (typeof row.supplier_name === "string" && row.supplier_name) return row.supplier_name;
  if (typeof row.new_file_name === "string" && row.new_file_name) return row.new_file_name;
  return `הוצאה ${row.id}`;
}

export function EditExpenseButton({ csrf, row }: { csrf: string; row: ExpenseRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" aria-label={`עריכת ${expenseTitle(row)}`} title="עריכה" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && (
        <Modal title={`עריכת הוצאה · ${expenseTitle(row)}`} onClose={() => setOpen(false)} wide>
          <ExpenseForm csrf={csrf} expense={row} onSaved={() => { setOpen(false); router.refresh(); }} />
        </Modal>
      )}
    </>
  );
}

// small — כפתור אייקון לשורת טבלה; אחרת כפתור עם טקסט
export function DeleteExpenseButton({ csrf, row, small = true, onDeleted }: { csrf: string; row: ExpenseRow; small?: boolean; onDeleted?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/expenses/${row.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "המחיקה נכשלה");
      setOpen(false);
      onDeleted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "המחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {small ? (
        <button type="button" className="icon-btn danger" aria-label={`מחיקת ${expenseTitle(row)}`} title="מחיקה" onClick={() => setOpen(true)}><TrashIcon size={18} /></button>
      ) : (
        <button type="button" className="btn btn-sm danger btn-icon-leading" onClick={() => setOpen(true)}><TrashIcon size={16} /><span>מחיקה</span></button>
      )}
      {open && (
        <Modal title="מחיקת הוצאה" onClose={() => (busy ? null : setOpen(false))}>
          <div className="stack">
            <p>האם למחוק את ההוצאה &quot;{expenseTitle(row)}&quot;{row.has_file ? " ואת הקובץ המצורף" : ""} לצמיתות? הפעולה אינה הפיכה.</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              <button type="button" className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? "מוחק…" : "מחיקה לצמיתות"}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
