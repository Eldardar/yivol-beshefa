"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { VillageForm } from "./village-form";
import { PlusIcon } from "./icons";

export function AddVillageButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת כפר</span></button>
      {open && <Modal title="הוספת כפר" onClose={() => setOpen(false)}><VillageForm csrf={csrf} /></Modal>}
    </>
  );
}
