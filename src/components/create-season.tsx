export function CreateSeason({ csrf, farmId }: { csrf: string; farmId: number }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="seasonCreate" />
      <input type="hidden" name="farmId" value={farmId} />
      <div className="field"><label>גידול<input className="input" name="crop" required maxLength={150} /></label></div>
      <div className="field"><label>מתאריך<input className="input" name="start" type="date" required /></label></div>
      <div className="field"><label>עד תאריך<input className="input" name="end" type="date" required /></label></div>
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} /></label></div>
      <button className="btn">הוספת עונה</button>
    </form>
  );
}
