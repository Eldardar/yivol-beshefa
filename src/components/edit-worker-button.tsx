"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { WorkerEditForm, type EditableWorker } from "./worker-edit-form";
import { PencilIcon } from "./icons";

export function EditWorkerButton({ csrf, worker }: { csrf: string; worker: EditableWorker }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת עובד" aria-label="עריכת עובד" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${worker.name}`} onClose={() => setOpen(false)}><WorkerEditForm csrf={csrf} worker={worker} /></Modal>}
    </>
  );
}
