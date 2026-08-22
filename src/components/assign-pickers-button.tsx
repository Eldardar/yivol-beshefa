"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { AssignPickersModal } from "./assign-pickers-modal";
import { UsersIcon } from "./icons";

export function AssignPickersButton({ shiftId, leaderId, date, csrf }: { shiftId: number; leaderId: number; date: string; csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="הקצאת עובדים" aria-label="הקצאת עובדים" onClick={() => setOpen(true)}><UsersIcon size={18} /></button>
      {open && (
        <Modal title="הקצאת עובדים" onClose={() => setOpen(false)}>
          <AssignPickersModal shiftId={shiftId} leaderId={leaderId} date={date} csrf={csrf} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
