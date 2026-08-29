"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { FieldFinancialsForm } from "./field-financials-form";
import { DollarIcon } from "./icons";

export function FieldFinancialsButton({ csrf, field }: { csrf: string; field: { id: number; name: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="נתונים כספיים" aria-label="נתונים כספיים" onClick={() => setOpen(true)}><DollarIcon size={18} /></button>
      {open && <Modal title={`נתונים כספיים — ${field.name}`} onClose={() => setOpen(false)}><FieldFinancialsForm csrf={csrf} fieldId={field.id} onClose={() => setOpen(false)} /></Modal>}
    </>
  );
}
