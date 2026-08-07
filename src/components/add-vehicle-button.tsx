"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { CreateVehicle } from "./create-vehicle";

export function AddVehicleButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><span>הוספת רכב</span><span aria-hidden="true">+</span></button>
      {open && <Modal title="הוספת רכב" onClose={() => setOpen(false)}><CreateVehicle csrf={csrf} /></Modal>}
    </>
  );
}
