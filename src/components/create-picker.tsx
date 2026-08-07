"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatePicker({ csrf }: { csrf: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    setBusy(true); setError(""); setPassword("");
    const form = new FormData(formElement);
    const body = Object.fromEntries(form);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, csrf }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      setPassword(data.initialPassword);
      formElement.reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <form className="stack" method="post" action="/api/admin/users" onSubmit={submit}>
        <input type="hidden" name="csrf" value={csrf} />
        <div className="field"><label>שם מלא<input className="input" name="name" required maxLength={100} /></label></div>
        <div className="field"><label>דוא״ל<input className="input" name="email" type="email" required maxLength={254} /></label></div>
        <div className="field"><label>טלפון<input className="input" name="phone" required maxLength={30} /></label></div>
        <div className="field"><label>תעודת זהות<input className="input" name="nationalId" required inputMode="numeric" pattern="[0-9]{9}" minLength={9} maxLength={9} autoComplete="off" /></label></div>
        <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} /></label></div>
        <button className="btn" disabled={busy}>{busy ? "יוצר…" : "יצירת עובד וסיסמה זמנית"}</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
      {password && (
        <div className="alert" role="status">
          <strong>הסיסמה מוצגת פעם אחת בלבד:</strong>
          <p><code>{password}</code></p>
          <p>העתיקו ומסרו לעובד בערוץ מאובטח. היא אינה נשמרת בטקסט גלוי.</p>
        </div>
      )}
    </div>
  );
}
