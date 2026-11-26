"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { useAction } from "@/lib/use-action";
import { TrashIcon } from "./icons";
import type { ManagedEntity } from "@/lib/services/admin";

export function DeleteRecordButton({ csrf, entity, id, name, label = "מחיקה לצמיתות", prompt }: { csrf: string; entity: ManagedEntity; id: number; name: string; label?: string; prompt?: string }) {
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();
  const [error, setError] = useState("");

  async function confirmDelete() {
    setError("");
    const formData = new FormData();
    formData.set("csrf", csrf);
    formData.set("action", "delete");
    formData.set("entity", entity);
    formData.set("entityId", String(id));
    const result = await run(formData);
    if (result.ok) setOpen(false);
    else setError(result.error);
  }

  return (
    <>
      <button type="button" className="btn btn-sm danger btn-icon-leading" onClick={() => setOpen(true)}>
        <TrashIcon size={16} /> {label}
      </button>
      {open && (
        <Modal title={label} onClose={() => (busy ? null : setOpen(false))}>
          <div className="stack">
            <p>{prompt ?? <>האם למחוק את &quot;{name}&quot; לצמיתות? הפעולה אינה הפיכה.</>}</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              <button type="button" className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? "מוחק…" : label}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
