"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { CreateSeason } from "./create-season";
import { SproutIcon } from "./icons";

export function AddSeasonButton({ csrf, farmId, farmName }: { csrf: string; farmId: number; farmName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="הוספת עונת גידול" aria-label="הוספת עונת גידול" onClick={() => setOpen(true)}><SproutIcon size={18} /></button>
      {open && <Modal title={`הוספת עונה ל${farmName}`} onClose={() => setOpen(false)}><CreateSeason csrf={csrf} farmId={farmId} /></Modal>}
    </>
  );
}
