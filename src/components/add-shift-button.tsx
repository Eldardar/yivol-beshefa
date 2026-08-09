"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { ShiftForm, type Picker, type SeasonOption } from "./shift-form";
import { PlusIcon } from "./icons";

export function AddShiftButton({ csrf, pickers, seasons }: { csrf: string; pickers: Picker[]; seasons: SeasonOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת משמרת</span></button>
      {open && (
        <Modal title="משמרת חדשה" onClose={() => setOpen(false)}>
          <ShiftForm csrf={csrf} pickers={pickers} seasons={seasons} existingPickerIds={[]} existingVehicleIds={[]} existingGoals={[]} />
        </Modal>
      )}
    </>
  );
}
