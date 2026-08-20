export type EditableWorker = { id: number; name: string; email: string; phone: string; national_id: string | null; notes: string; role: "ADMIN" | "PICKER" };

export function WorkerEditForm({ csrf, worker }: { csrf: string; worker: EditableWorker }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="userUpdate" />
      <input type="hidden" name="userId" value={worker.id} />
      <div className="field"><label>שם מלא<input className="input" name="name" required maxLength={100} defaultValue={worker.name} /></label></div>
      <div className="field"><label>דוא״ל<input className="input" name="email" type="email" required maxLength={254} defaultValue={worker.email} /></label></div>
      <div className="field"><label>טלפון<input className="input" name="phone" required maxLength={30} defaultValue={worker.phone} /></label></div>
      {worker.role === "PICKER" && (
        <div className="field"><label>תעודת זהות<input className="input" name="nationalId" required inputMode="numeric" pattern="[0-9]{9}" minLength={9} maxLength={9} autoComplete="off" defaultValue={worker.national_id ?? ""} /></label></div>
      )}
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} defaultValue={worker.notes} /></label></div>
      <button className="btn">שמירת שינויים</button>
    </form>
  );
}
