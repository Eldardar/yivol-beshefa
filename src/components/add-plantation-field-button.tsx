"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { CreatePlantationField } from "./create-plantation-field";
import { SproutIcon } from "./icons";

export function AddPlantationFieldButton({ csrf, farmId, farmName }: { csrf: string; farmId: number; farmName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="הוספת חלקת גידול" aria-label="הוספת חלקת גידול" onClick={() => setOpen(true)}><SproutIcon size={18} /></button>
      {open && <Modal title={`הוספת חלקה ל${farmName}`} onClose={() => setOpen(false)}><CreatePlantationField csrf={csrf} farmId={farmId} /></Modal>}
    </>
  );
}
