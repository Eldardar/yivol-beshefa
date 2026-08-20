"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { PlantationFieldForm, type EditablePlantationField } from "./plantation-field-form";
import { PencilIcon } from "./icons";

export function EditPlantationFieldButton({ csrf, farmId, field }: { csrf: string; farmId: number; field: EditablePlantationField }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת חלקה" aria-label="עריכת חלקה" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${field.name}`} onClose={() => setOpen(false)}><PlantationFieldForm csrf={csrf} farmId={farmId} field={field} /></Modal>}
    </>
  );
}
