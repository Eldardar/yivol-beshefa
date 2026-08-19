export function CreatePlantationField({ csrf, farmId }: { csrf: string; farmId: number }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="plantationFieldCreate" />
      <input type="hidden" name="farmId" value={farmId} />
      <div className="field"><label>שם<input className="input" name="name" required maxLength={150} /></label></div>
      <div className="field"><label>סוג פרי<input className="input" name="fruitType" required maxLength={150} /></label></div>
      <div className="field"><label>תת-סוג<input className="input" name="fruitSubtype" required maxLength={150} /></label></div>
      <div className="field"><label>גודל (דונם)<input className="input" name="size" type="number" min="0" step="any" /></label></div>
      <div className="field"><label>מיקום<input className="input" name="location" maxLength={300} /></label></div>
      <div className="field"><label>פרטים<textarea className="input" name="details" maxLength={2000} /></label></div>
      <button className="btn">הוספת חלקה</button>
    </form>
  );
}
