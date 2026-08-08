export function CreateFarmer({ csrf }: { csrf: string }) {
  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="farmCreate" />
      <div className="field"><label>שם החקלאי<input className="input" name="name" required maxLength={150} /></label></div>
      <div className="field"><label>איש קשר<input className="input" name="contact" required maxLength={150} /></label></div>
      <div className="field"><label>טלפון<input className="input" name="phone" required maxLength={30} /></label></div>
      <div className="field"><label>כתובת<input className="input" name="address" required maxLength={300} /></label></div>
      <div className="field"><label>קישור ניווט (אופציונלי)<input className="input" name="navigation" type="url" placeholder="https://" maxLength={500} /></label></div>
      <div className="field"><label>הערות<textarea className="input" name="notes" maxLength={2000} /></label></div>
      <button className="btn">הוספת חקלאי</button>
    </form>
  );
}
