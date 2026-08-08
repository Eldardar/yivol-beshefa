"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { CreateVehicle } from "./create-vehicle";
import { PlusIcon } from "./icons";

export function AddVehicleButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת רכב</span></button>
      {open && <Modal title="הוספת רכב" onClose={() => setOpen(false)}><CreateVehicle csrf={csrf} /></Modal>}
    </>
  );
}
