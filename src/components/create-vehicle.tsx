export function CreateVehicle({ csrf }: { csrf: string }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="vehicleCreate" />
      <div className="field"><label>מספר רכב<input className="input" name="number" required maxLength={50} /></label></div>
      <div className="field"><label>שם הרכב<input className="input" name="name" required maxLength={150} /></label></div>
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} /></label></div>
      <button className="btn">הוספת רכב</button>
    </form>
  );
}
