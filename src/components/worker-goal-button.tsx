"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { UnitLines } from "./unit-lines";
import type { Unit } from "@/lib/units";

export function WorkerGoalButton({ csrf, shiftId, existingGoal }: { csrf: string; shiftId: number; existingGoal: Array<{ value: number; unit: Unit }> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>{existingGoal.length ? "עריכת יעד אישי" : "קביעת יעד אישי"}</button>
      {open && (
        <Modal title="יעד אישי למשמרת" onClose={() => setOpen(false)}>
          <form className="stack" action="/api/actions" method="post">
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="action" value="workerGoalSet" />
            <input type="hidden" name="shiftId" value={shiftId} />
            <div className="field">
              <span>יעד אישי</span>
              <UnitLines valueName="goalQty" unitName="goalUnit" initial={existingGoal} addLabel="הוספת יעד נוסף" valueLabel="יעד" unitLabel="יחידת מידה ליעד" />
            </div>
            <div className="actions">
              <button className="btn">שמירה</button>
              <button type="button" className="btn secondary" onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
