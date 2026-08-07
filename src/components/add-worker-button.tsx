"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { CreatePicker } from "./create-picker";

export function AddWorkerButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><span>הוספת עובד</span><span aria-hidden="true">+</span></button>
      {open && <Modal title="הוספת עובד" onClose={() => setOpen(false)}><CreatePicker csrf={csrf} /></Modal>}
    </>
  );
}
