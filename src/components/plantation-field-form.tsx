import { CoordinatesField } from "./location-value";
import { UNITS, UNIT_LABEL, type Unit } from "@/lib/units";

export type EditablePlantationField = { id: number; name: string; fruit_type: string; fruit_subtype: string; size: number | null; location: string; latitude: number | null; longitude: number | null; details: string; company_rates: Partial<Record<Unit, number>> };

export function PlantationFieldForm({ csrf, farmId, farmName, field }: { csrf: string; farmId: number; farmName?: string; field?: EditablePlantationField }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={field ? "plantationFieldUpdate" : "plantationFieldCreate"} />
      <input type="hidden" name="farmId" value={farmId} />
      {field && <input type="hidden" name="fieldId" value={field.id} />}
      {farmName && (
        <div className="field"><label>חקלאי
          <select className="input" disabled defaultValue={farmId}>
            <option value={farmId}>{farmName}</option>
          </select>
        </label></div>
      )}
      <div className="field"><label>שם<input className="input" name="name" required maxLength={150} defaultValue={field?.name} /></label></div>
      <div className="field"><label>סוג פרי<input className="input" name="fruitType" required maxLength={150} defaultValue={field?.fruit_type} /></label></div>
      <div className="field"><label>תת-סוג<input className="input" name="fruitSubtype" required maxLength={150} defaultValue={field?.fruit_subtype} /></label></div>
      <div className="field"><label>גודל (דונם)<input className="input" name="size" type="number" min="0" step="any" defaultValue={field?.size ?? undefined} /></label></div>
      <div className="field"><label>מיקום (קישור גוגל מפות)<input className="input" name="location" maxLength={300} dir="auto" placeholder="https://maps.app.goo.gl/..." defaultValue={field?.location} /></label></div>
      <CoordinatesField latitude={field?.latitude ?? null} longitude={field?.longitude ?? null} />
      <div className="field"><label>פרטים<textarea className="input" name="details" maxLength={2000} defaultValue={field?.details} /></label></div>
      <fieldset className="village-fieldset">
        <legend>הכנסת החברה ליחידה</legend>
        <p className="muted">כמה החברה מקבלת מהחקלאי לכל יחידה (לפי יעדי ותוצאות המשמרת, לא שכר העובדים). יש למלא רק את היחידות הרלוונטיות.</p>
        <div className="company-rates">
          {UNITS.map(unit => (
            <label key={unit} className="line-row">
              <span className="company-rate-unit">{UNIT_LABEL[unit]}</span>
              <input className="input" name={`companyRate_${unit}`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="—" defaultValue={field?.company_rates[unit]} aria-label={`הכנסת החברה בש"ח ליחידת ${UNIT_LABEL[unit]}`} />
              <span className="muted">₪</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn">{field ? "שמירת שינויים" : "הוספת חלקה"}</button>
    </form>
  );
}
