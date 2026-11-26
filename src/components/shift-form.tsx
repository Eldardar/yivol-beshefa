"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { UnitLines } from "./unit-lines";
import { Modal, useModalClose } from "./modal";
import { useAction } from "@/lib/use-action";
import { MultiDatePicker } from "./multi-date-picker";
import { REPORT_UNITS, UNITS, UNIT_LABEL, type Unit } from "@/lib/units";

const NO_LEADER = "none";
export const LEADER_CONFLICT_MARKER = "שיבוץ כפול למוביל המשמרת";
const LEADER_ERRORS = ["שיבוץ כפול למוביל המשמרת"];
const FIELD_ERRORS = ["חלקת הגידול אינה פעילה"];
const MAX_BULK_DATES = 62;

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
  leader_id: number | null;
  leader_name?: string;
  notes: string;
  status?: string;
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
  existingPersonalGoalUnits,
  onSuccess
}: {
  csrf: string;
  pickers: Picker[];
  farms: FarmOption[];
  plantationFieldsByFarm: PlantationFieldsByFarm;
  shift?: EditableShift;
  existingPickerIds: number[];
  existingVehicleIds: number[];
  existingGoals: Array<{ value: number; unit: Unit; actual?: number | null }>;
  existingPersonalGoalUnits: Unit[];
  onSuccess?: () => void;
}) {
  const [leaderId, setLeaderId] = useState(shift ? (shift.leader_id == null ? NO_LEADER : String(shift.leader_id)) : "");
  const [farmId, setFarmId] = useState(shift ? String(shift.farm_id) : "");
  const [fieldId, setFieldId] = useState(shift ? String(shift.plantation_field_id) : "");
  const [startTime, setStartTime] = useState(shift?.start_time ?? "06:00");
  const [endTime, setEndTime] = useState(shift?.end_time ?? "14:00");
  const [date, setDate] = useState(shift?.date ?? "");
  const [multiDate, setMultiDate] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { run, busy } = useAction();
  const closeModal = useModalClose();
  const [leaderConflict, setLeaderConflict] = useState<{ message: string; formData: FormData } | null>(null);
  const [confirmCompletedEdit, setConfirmCompletedEdit] = useState<FormData | null>(null);
  const [actuals, setActuals] = useState<Record<string, string>>(() => Object.fromEntries(existingGoals.map(g => [g.unit, g.actual != null ? String(g.actual) : ""])));
  const [personalGoalUnits, setPersonalGoalUnits] = useState<Unit[]>(existingPersonalGoalUnits);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (error) formRef.current?.closest(".modal")?.scrollTo(0, 0);
  }, [error]);

  const pickerIds = useMemo(() => {
    const set = new Set(existingPickerIds.map(String));
    if (leaderId && leaderId !== NO_LEADER) set.add(leaderId);
    return [...set];
  }, [leaderId, existingPickerIds]);

  const fields = farmId ? (plantationFieldsByFarm[Number(farmId)] ?? []) : [];

  const leaderOptions = useMemo(() => {
    if (shift && shift.leader_id != null && !pickers.some(p => p.id === shift.leader_id)) {
      return [{ id: shift.leader_id, name: `${shift.leader_name ?? "קוטף שאינו פעיל"} (לא פעיל)` }, ...pickers];
    }
    return pickers;
  }, [pickers, shift]);

  async function submitForm(formData: FormData) {
    setError("");
    const result = await run(formData);
    if (result.ok) {
      (onSuccess ?? closeModal)?.();
      return;
    }
    const message = result.error;
    if (message.includes(LEADER_CONFLICT_MARKER)) {
      setLeaderConflict({ message, formData });
      return;
    }
    setError(message);
    if (LEADER_ERRORS.some(m => message.includes(m))) setLeaderId("");
    if (FIELD_ERRORS.some(m => message.includes(m))) { setFarmId(""); setFieldId(""); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (multiDate && dates.length === 0) {
      setError("יש לבחור לפחות תאריך אחד בלוח");
      return;
    }
    if (shift?.status === "COMPLETED") {
      setConfirmCompletedEdit(formData);
      return;
    }
    await submitForm(formData);
  }

  function confirmLeaderConflict() {
    if (!leaderConflict) return;
    leaderConflict.formData.set("overrideLeaderConflict", "1");
    const formData = leaderConflict.formData;
    setLeaderConflict(null);
    void submitForm(formData);
  }

  function confirmCompletedEditAndSave() {
    if (!confirmCompletedEdit) return;
    const formData = confirmCompletedEdit;
    setConfirmCompletedEdit(null);
    void submitForm(formData);
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
        <div className="field">
          <label htmlFor="shift-date">{multiDate ? "תאריכים" : "תאריך"}</label>
          {multiDate ? (
            <p className="muted">{dates.length ? `${dates.length} תאריכים נבחרו בלוח` : "בחרו תאריכים בלוח שלמטה"}</p>
          ) : (
            <input className="input" id="shift-date" type="date" name="date" required value={date} onChange={e => setDate(e.target.value)} />
          )}
          {!shift && (
            <label className="switch-row">
              <span className="switch">
                <input
                  type="checkbox"
                  name="multiDate"
                  value="1"
                  checked={multiDate}
                  onChange={e => {
                    setMultiDate(e.target.checked);
                    if (e.target.checked && date && dates.length === 0) setDates([date]);
                    if (!e.target.checked && !date && dates[0]) setDate(dates[0]);
                  }}
                />
                <span className="switch-track" aria-hidden="true" />
              </span>
              <span>יצירה מרובה — משמרות זהות במספר תאריכים</span>
            </label>
          )}
        </div>
        {multiDate && (
          <div className="field multi-date-field">
            <MultiDatePicker name="dates" value={dates} onChange={setDates} max={MAX_BULK_DATES} />
          </div>
        )}
        <div className="field"><label htmlFor="shift-start-time">שעת התחלה</label><input className="input" id="shift-start-time" type="time" name="startTime" required value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="shift-end-time">שעת סיום משוערת</label>
          <input className="input" id="shift-end-time" type="time" name="endTime" required value={endTime} onChange={e => setEndTime(e.target.value)} />
          {startTime && endTime && endTime <= startTime && (
            <p className="muted btn-icon-leading"><span aria-hidden="true">⚠️</span>שים לב, משמרת זו נגמרת ביום שאחרי</p>
          )}
        </div>
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
            <option value={NO_LEADER}>ללא</option>
            {leaderOptions.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
          </select>
          {leaderId === NO_LEADER && <p className="alert alert-warn" role="status">שימו לב: משמרת ללא מוביל — רק מנהל יוכל לדווח כמויות עבורה.</p>}
        </div>
      </div>
      <div className="field">
        <span>יעד</span>
        <UnitLines valueName="goalQty" unitName="goalUnit" initial={existingGoals} addLabel="הוספת יעד נוסף" valueLabel="יעד" unitLabel="יחידת מידה ליעד" units={UNITS} />
      </div>
      <div className="field">
        <span>יחידות מידה ליעד אישי של קוטפים</span>
        <p className="muted">הקוטפים המשובצים למשמרת יוכלו לקבוע יעד אישי רק ביחידות המידה שנבחרו כאן. אם לא תיבחר אף יחידה, כל יחידות המידה יהיו זמינות.</p>
        <div className="stack">
          {REPORT_UNITS.map(u => (
            <label className="switch-row" key={u}>
              <span className="switch">
                <input
                  type="checkbox"
                  name="personalGoalUnits"
                  value={u}
                  checked={personalGoalUnits.includes(u)}
                  onChange={e => setPersonalGoalUnits(list => e.target.checked ? [...list, u] : list.filter(x => x !== u))}
                />
                <span className="switch-track" aria-hidden="true" />
              </span>
              <span>{UNIT_LABEL[u]}</span>
            </label>
          ))}
        </div>
      </div>
      {shift?.status === "COMPLETED" && existingGoals.length > 0 && (
        <div className="field">
          <span>תוצאה סופית</span>
          <span className="muted">הכמות שהושגה בפועל במשמרת</span>
          <div className="stack">
            {existingGoals.map(g => (
              <div className="line-row" key={g.unit}>
                <input type="hidden" name="actualUnit" value={g.unit} />
                <input
                  className="input"
                  name="actualQty"
                  aria-label={`תוצאה סופית ל${UNIT_LABEL[g.unit]}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={actuals[g.unit] ?? ""}
                  onChange={e => setActuals(a => ({ ...a, [g.unit]: e.target.value }))}
                />
                <span>{UNIT_LABEL[g.unit]} (יעד: <span dir="ltr" className="ltr-field">{g.value}</span>)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="field"><label htmlFor="shift-notes">הערות</label><textarea className="input" id="shift-notes" name="notes" maxLength={4000} defaultValue={shift?.notes} /></div>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? "שומר…" : shift ? "שמירת שינויים" : multiDate && dates.length > 1 ? `יצירת ${dates.length} טיוטות` : "יצירת טיוטה"}</button>
      </div>
      {leaderConflict && (
        <Modal title="שיבוץ כפול למוביל המשמרת" onClose={() => setLeaderConflict(null)}>
          <div className="stack">
            <p role="alert">{leaderConflict.message}</p>
            <p>{multiDate && dates.length > 1 ? "ליצור את המשמרות בכל זאת?" : "ליצור את המשמרת בכל זאת?"}</p>
            <div className="actions">
              <button type="button" className="btn" disabled={busy} onClick={confirmLeaderConflict}>{busy ? "שומר…" : shift ? "שמירה בכל זאת" : "יצירה בכל זאת"}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setLeaderConflict(null)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
      {confirmCompletedEdit && (
        <Modal title="עריכת משמרת שהסתיימה" onClose={() => setConfirmCompletedEdit(null)}>
          <div className="stack">
            <p role="alert">המשמרת כבר סומנה כהושלמה. שינוי הפרטים עלול להשפיע על דיווחי הקוטפים והתשלומים שחושבו עבורה.</p>
            <p>לשמור את השינויים בכל זאת?</p>
            <div className="actions">
              <button type="button" className="btn" disabled={busy} onClick={confirmCompletedEditAndSave}>{busy ? "שומר…" : "שמירה בכל זאת"}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setConfirmCompletedEdit(null)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}
