"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { VillageForm, type EditableVillage } from "./village-form";
import { PencilIcon } from "./icons";

export function EditVillageButton({ csrf, village }: { csrf: string; village: EditableVillage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת כפר" aria-label="עריכת כפר" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${village.name}`} onClose={() => setOpen(false)}><VillageForm csrf={csrf} village={village} /></Modal>}
    </>
  );
}
