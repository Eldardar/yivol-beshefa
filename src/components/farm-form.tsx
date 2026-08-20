export type EditableFarm = { id: number; name: string; contact_person: string; phone: string; address: string; navigation_link: string | null; notes: string };

export function FarmForm({ csrf, farm }: { csrf: string; farm?: EditableFarm }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={farm ? "farmUpdate" : "farmCreate"} />
      {farm && <input type="hidden" name="farmId" value={farm.id} />}
      <div className="field"><label>שם החקלאי<input className="input" name="name" required maxLength={150} defaultValue={farm?.name} /></label></div>
      <div className="field"><label>איש קשר<input className="input" name="contact" required maxLength={150} defaultValue={farm?.contact_person} /></label></div>
      <div className="field"><label>טלפון<input className="input" name="phone" required maxLength={30} defaultValue={farm?.phone} /></label></div>
      <div className="field"><label>כתובת<input className="input" name="address" required maxLength={300} defaultValue={farm?.address} /></label></div>
      <div className="field"><label>קישור ניווט (אופציונלי)<input className="input" name="navigation" type="url" placeholder="https://" maxLength={500} defaultValue={farm?.navigation_link ?? ""} /></label></div>
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} defaultValue={farm?.notes} /></label></div>
      <button className="btn">{farm ? "שמירת שינויים" : "הוספת חקלאי"}</button>
    </form>
  );
}
