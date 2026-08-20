"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { VehicleForm, type EditableVehicle } from "./vehicle-form";
import { PencilIcon } from "./icons";

export function EditVehicleButton({ csrf, vehicle }: { csrf: string; vehicle: EditableVehicle }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת רכב" aria-label="עריכת רכב" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${vehicle.name}`} onClose={() => setOpen(false)}><VehicleForm csrf={csrf} vehicle={vehicle} /></Modal>}
    </>
  );
}
