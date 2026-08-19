"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { ShiftForm, type Picker, type FarmOption, type PlantationFieldsByFarm } from "./shift-form";
import { PlusIcon } from "./icons";

export function AddShiftButton({ csrf, pickers, farms, plantationFieldsByFarm }: { csrf: string; pickers: Picker[]; farms: FarmOption[]; plantationFieldsByFarm: PlantationFieldsByFarm }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setOpen(true)}><PlusIcon size={18} /><span>הוספת משמרת</span></button>
      {open && (
        <Modal title="משמרת חדשה" onClose={() => setOpen(false)}>
          <ShiftForm csrf={csrf} pickers={pickers} farms={farms} plantationFieldsByFarm={plantationFieldsByFarm} existingPickerIds={[]} existingVehicleIds={[]} existingGoals={[]} />
        </Modal>
      )}
    </>
  );
}
