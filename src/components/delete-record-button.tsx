"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { TrashIcon } from "./icons";
import type { ManagedEntity } from "@/lib/services/admin";

export function DeleteRecordButton({ csrf, entity, id, name }: { csrf: string; entity: ManagedEntity; id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    const formData = new FormData();
    formData.set("csrf", csrf);
    formData.set("action", "delete");
    formData.set("entity", entity);
    formData.set("entityId", String(id));
    try {
      const res = await fetch("/api/actions", { method: "POST", body: formData });
      const url = new URL(res.url);
      const message = url.searchParams.get("error");
      if (message) {
        setError(message);
        setBusy(false);
        return;
      }
      window.location.href = res.url;
    } catch {
      setError("הפעולה נכשלה");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-sm danger btn-icon-leading" onClick={() => setOpen(true)}>
        <TrashIcon size={16} /> מחיקה לצמיתות
      </button>
      {open && (
        <Modal title="מחיקה לצמיתות" onClose={() => (busy ? null : setOpen(false))}>
          <div className="stack">
            <p>האם למחוק את &quot;{name}&quot; לצמיתות? הפעולה אינה הפיכה.</p>
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
