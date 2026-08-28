"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnitLines } from "./unit-lines";
import type { Unit } from "@/lib/units";

const LEADER_ERRORS = ["קוטף אינו זמין", "שיבוץ כפול", "קוטף אינו פעיל"];
const FIELD_ERRORS = ["חלקת הגידול אינה פעילה"];

export type Picker = { id: number; name: string };
export type FarmOption = { id: number; name: string };
export type PlantationFieldOption = { id: number; name: string; fruitType: string; fruitSubtype: string };
export type PlantationFieldsByFarm = Record<number, PlantationFieldOption[]>;

export type EditableShift = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  farm_id: number;
  plantation_field_id: number;
  leader_id: number;
  notes: string;
};

export function ShiftForm({
  csrf,
  pickers,
  farms,
  plantationFieldsByFarm,
  shift,
  existingPickerIds,
  existingVehicleIds,
  existingGoals,
  onSuccess
}: {
  csrf: string;
  pickers: Picker[];
  farms: FarmOption[];
  plantationFieldsByFarm: PlantationFieldsByFarm;
  shift?: EditableShift;
  existingPickerIds: number[];
  existingVehicleIds: number[];
  existingGoals: Array<{ value: number; unit: Unit }>;
  onSuccess?: (redirectTo: string) => void;
}) {
  const [leaderId, setLeaderId] = useState(shift ? String(shift.leader_id) : "");
  const [farmId, setFarmId] = useState(shift ? String(shift.farm_id) : "");
  const [fieldId, setFieldId] = useState(shift ? String(shift.plantation_field_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (error) formRef.current?.closest(".modal")?.scrollTo(0, 0);
  }, [error]);

  const pickerIds = useMemo(() => {
    const set = new Set(existingPickerIds.map(String));
    if (leaderId) set.add(leaderId);
    return [...set];
  }, [leaderId, existingPickerIds]);

  const fields = farmId ? (plantationFieldsByFarm[Number(farmId)] ?? []) : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/actions", { method: "POST", body: new FormData(e.currentTarget) });
      const url = new URL(res.url);
      const message = url.searchParams.get("error");
      if (message) {
        setError(message);
        if (LEADER_ERRORS.some(m => message.includes(m))) setLeaderId("");
        if (FIELD_ERRORS.some(m => message.includes(m))) { setFarmId(""); setFieldId(""); }
        return;
      }
      onSuccess?.(url.pathname + url.search);
    } catch {
      setError("שגיאת תקשורת, נסו שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" ref={formRef} onSubmit={handleSubmit}>
      {error && <p className="alert" role="alert">{error}</p>}
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={shift ? "shiftUpdate" : "shiftCreate"} />
      {shift && <input type="hidden" name="shiftId" value={shift.id} />}
      {pickerIds.map(id => <input type="hidden" name="pickerIds" value={id} key={id} />)}
      {existingVehicleIds.map(id => <input type="hidden" name="vehicleIds" value={id} key={id} />)}
      <div className="grid">
        <div className="field"><label htmlFor="shift-date">תאריך</label><input className="input" id="shift-date" type="date" name="date" required defaultValue={shift?.date} /></div>
        <div className="field"><label htmlFor="shift-start-time">שעת התחלה</label><input className="input" id="shift-start-time" type="time" name="startTime" required defaultValue={shift?.start_time ?? "06:00"} /></div>
        <div className="field"><label htmlFor="shift-end-time">שעת סיום משוערת</label><input className="input" id="shift-end-time" type="time" name="endTime" required defaultValue={shift?.end_time ?? "14:00"} /></div>
        <div className="field">
          <label htmlFor="shift-farm">חקלאי</label>
          <select className="input" id="shift-farm" required value={farmId} onChange={e => { setFarmId(e.target.value); setFieldId(""); }}>
            <option value="" disabled>בחירת חקלאי</option>
            {farms.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="shift-field">חלקת גידול</label>
          <select className="input" id="shift-field" name="plantationFieldId" required value={fieldId} onChange={e => setFieldId(e.target.value)} disabled={!farmId}>
            <option value="" disabled>{farmId ? "בחירת חלקה" : "יש לבחור חקלאי תחילה"}</option>
            {fields.map(f => <option value={f.id} key={f.id}>{f.name} · {f.fruitType} · {f.fruitSubtype}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="shift-leader">מוביל משמרת</label>
          <select className="input" id="shift-leader" name="leaderId" required value={leaderId} onChange={e => setLeaderId(e.target.value)}>
            <option value="" disabled>בחירת מוביל</option>
            {pickers.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <span>יעד</span>
        <UnitLines valueName="goalQty" unitName="goalUnit" initial={existingGoals} addLabel="הוספת יעד נוסף" valueLabel="יעד" unitLabel="יחידת מידה ליעד" />
      </div>
      <div className="field"><label htmlFor="shift-notes">הערות</label><textarea className="input" id="shift-notes" name="notes" maxLength={4000} defaultValue={shift?.notes} /></div>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? "שומר…" : shift ? "שמירת שינויים" : "יצירת טיוטה"}</button>
      </div>
    </form>
  );
}
