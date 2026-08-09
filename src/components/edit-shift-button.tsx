"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { ShiftForm, type EditableShift, type Picker, type SeasonOption } from "./shift-form";
import { PencilIcon } from "./icons";
import type { Unit } from "@/lib/units";

export function EditShiftButton({
  csrf,
  pickers,
  seasons,
  shift,
  existingPickerIds,
  existingVehicleIds,
  existingGoals
}: {
  csrf: string;
  pickers: Picker[];
  seasons: SeasonOption[];
  shift: EditableShift;
  existingPickerIds: number[];
  existingVehicleIds: number[];
  existingGoals: Array<{ value: number; unit: Unit }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת משמרת" aria-label="עריכת משמרת" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && (
        <Modal title={`עריכת משמרת ${shift.id}`} onClose={() => setOpen(false)}>
          <ShiftForm csrf={csrf} pickers={pickers} seasons={seasons} shift={shift} existingPickerIds={existingPickerIds} existingVehicleIds={existingVehicleIds} existingGoals={existingGoals} />
        </Modal>
      )}
    </>
  );
}
