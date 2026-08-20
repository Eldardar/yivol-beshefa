export type EditableVehicle = { id: number; number: string; name: string; notes: string };

export function VehicleForm({ csrf, vehicle }: { csrf: string; vehicle?: EditableVehicle }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={vehicle ? "vehicleUpdate" : "vehicleCreate"} />
      {vehicle && <input type="hidden" name="vehicleId" value={vehicle.id} />}
      <div className="field"><label>מספר רכב<input className="input" name="number" required maxLength={50} defaultValue={vehicle?.number} /></label></div>
      <div className="field"><label>שם הרכב<input className="input" name="name" required maxLength={150} defaultValue={vehicle?.name} /></label></div>
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} defaultValue={vehicle?.notes} /></label></div>
      <button className="btn">{vehicle ? "שמירת שינויים" : "הוספת רכב"}</button>
    </form>
  );
}
