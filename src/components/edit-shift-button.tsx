"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { ShiftForm, type EditableShift, type Picker, type FarmOption, type PlantationFieldsByFarm } from "./shift-form";
import { PencilIcon } from "./icons";
import type { Unit } from "@/lib/units";

export function EditShiftButton({
  csrf,
  pickers,
  farms,
  plantationFieldsByFarm,
  shift,
  existingPickerIds,
  existingVehicleIds,
  existingGoals
}: {
  csrf: string;
  pickers: Picker[];
  farms: FarmOption[];
  plantationFieldsByFarm: PlantationFieldsByFarm;
  shift: EditableShift;
  existingPickerIds: number[];
  existingVehicleIds: number[];
  existingGoals: Array<{ value: number; unit: Unit }>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button type="button" className="icon-btn" title="עריכת משמרת" aria-label="עריכת משמרת" onClick={() => setOpen(true)}><PencilIcon size={18} /></button>
      {open && (
        <Modal title={`עריכת משמרת ${shift.id}`} onClose={() => setOpen(false)}>
          <ShiftForm
            csrf={csrf}
            pickers={pickers}
            farms={farms}
            plantationFieldsByFarm={plantationFieldsByFarm}
            shift={shift}
            existingPickerIds={existingPickerIds}
            existingVehicleIds={existingVehicleIds}
            existingGoals={existingGoals}
            onSuccess={redirectTo => { setOpen(false); router.push(redirectTo); }}
          />
        </Modal>
      )}
    </>
  );
}
