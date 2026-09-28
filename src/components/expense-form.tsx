"use client";
import { useState } from "react";
import { EDITABLE_FIELDS as FORM_FIELDS, type ExpenseRow } from "@/lib/expenses";

// בלי expense — הוספה ידנית; עם expense — עריכה, כשהערכים שכבר נשמרו (למשל מחילוץ חלקי) ממולאים מראש
export function ExpenseForm({ csrf, expense, onSaved }: { csrf: string; expense?: ExpenseRow; onSaved: (invoiceDate: string | null) => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(FORM_FIELDS.map(field => [field.key, String(form.get(field.key) ?? "")]));
    try {
      const res = await fetch("/api/admin/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf, id: expense?.id, values }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
      onSaved(values.invoice_date || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="expense-form-grid">
        {FORM_FIELDS.map(field => (
          <div className={`field${field.kind === "longtext" ? " field--wide" : ""}`} key={field.key}>
            <label>
              {field.label}
              {field.kind === "longtext" ? (
                <textarea className="input" name={field.key} maxLength={5000} defaultValue={expense?.[field.key] ?? undefined} />
              ) : (
                <input
                  className="input"
                  name={field.key}
                  type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
                  step={field.kind === "number" ? "any" : undefined}
                  maxLength={field.kind === "text" ? 500 : undefined}
                  required={field.key === "invoice_date"}
                  defaultValue={expense?.[field.key] ?? undefined}
                />
              )}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="btn" disabled={saving}>{saving ? "שומר…" : "שמירת הוצאה"}</button>
    </form>
  );
}
