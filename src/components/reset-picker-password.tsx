"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetPickerPassword({ csrf, userId }: { csrf: string; userId: number }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setPassword("");
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      setPassword(data.temporaryPassword);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <form method="post" action="/api/admin/users/reset-password" onSubmit={submit}>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="userId" value={userId} />
        <button className="icon-btn" disabled={busy} title="איפוס סיסמה" aria-label="איפוס סיסמה">{busy ? "…" : "🔑"}</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
      {password && (
        <div className="alert" role="status">
          <strong>הסיסמה החדשה מוצגת פעם אחת בלבד:</strong>
          <p><code>{password}</code></p>
        </div>
      )}
    </div>
  );
}
