"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { WorkerEditForm, type EditableWorker } from "./worker-edit-form";
import { PencilIcon } from "./icons";
import { AvatarEditor } from "./avatar-editor";

export function EditWorkerButton({ csrf, worker }: { csrf: string; worker: EditableWorker }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת עובד" aria-label="עריכת עובד" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && (
        <Modal title={`עריכת ${worker.name}`} onClose={() => setOpen(false)}>
          <div className="stack">
            <AvatarEditor csrf={csrf} userId={worker.id} name={worker.name} avatarVersion={worker.avatar_version ?? null} />
            <WorkerEditForm csrf={csrf} worker={worker} />
          </div>
        </Modal>
      )}
    </>
  );
}
