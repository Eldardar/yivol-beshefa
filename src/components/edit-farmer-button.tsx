"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { FarmForm, type EditableFarm } from "./farm-form";
import { PencilIcon } from "./icons";

export function EditFarmerButton({ csrf, farm }: { csrf: string; farm: EditableFarm }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת חקלאי" aria-label="עריכת חקלאי" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && <Modal title={`עריכת ${farm.name}`} onClose={() => setOpen(false)}><FarmForm csrf={csrf} farm={farm} /></Modal>}
    </>
  );
}
