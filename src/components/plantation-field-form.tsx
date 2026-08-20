export type EditablePlantationField = { id: number; name: string; fruit_type: string; fruit_subtype: string; size: number | null; location: string; details: string };

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
      <div className="field"><label>מיקום<input className="input" name="location" maxLength={300} defaultValue={field?.location} /></label></div>
      <div className="field"><label>פרטים<textarea className="input" name="details" maxLength={2000} defaultValue={field?.details} /></label></div>
      <button className="btn">{field ? "שמירת שינויים" : "הוספת חלקה"}</button>
    </form>
  );
}
