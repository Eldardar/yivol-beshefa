"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { AssignVehiclesModal } from "./assign-vehicles-modal";
import { TruckIcon } from "./icons";

export function AssignVehiclesButton({ shiftId, csrf }: { shiftId: number; csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="הקצאת רכבים" aria-label="הקצאת רכבים" onClick={() => setOpen(true)}><TruckIcon size={18} /></button>
      {open && (
        <Modal title="הקצאת רכבים" onClose={() => setOpen(false)}>
          <AssignVehiclesModal shiftId={shiftId} csrf={csrf} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
