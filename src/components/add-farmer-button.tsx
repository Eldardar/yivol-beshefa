"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { FarmForm } from "./farm-form";
import { PlusIcon } from "./icons";

export function AddFarmerButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת חקלאי</span></button>
      {open && <Modal title="הוספת חקלאי" onClose={() => setOpen(false)}><FarmForm csrf={csrf} /></Modal>}
    </>
  );
}
