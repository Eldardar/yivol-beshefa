"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { PlantationFieldForm } from "./plantation-field-form";
import { PlusIcon } from "./icons";

export function AddPlantationFieldButton({ csrf, farmId, farmName }: { csrf: string; farmId: number; farmName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת חלקה</span></button>
      {open && <Modal title={`הוספת חלקה ל${farmName}`} onClose={() => setOpen(false)}><PlantationFieldForm csrf={csrf} farmId={farmId} farmName={farmName} /></Modal>}
    </>
  );
}
