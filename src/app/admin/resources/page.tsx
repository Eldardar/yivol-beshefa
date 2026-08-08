import { AppShell } from "@/components/nav";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { formatHebrewDate } from "@/lib/dates";
import { TrashIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const Hidden = ({ csrf, action }: { csrf: string; action: string }) => (
  <>
    <input type="hidden" name="csrf" value={csrf} />
    <input type="hidden" name="action" value={action} />
  </>
);

type Farm = { id: number; name: string; address: string; active: number };
type Season = { id: number; farm: string; crop: string; start_date: string; end_date: string; active: number };

export default async function Resources({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();
  const farms = database.prepare("SELECT id,name,address,active FROM farms ORDER BY active DESC,name").all() as Farm[];
  const seasons = database
    .prepare("SELECT se.id,se.crop,se.start_date,se.end_date,se.active,f.name farm FROM seasons se JOIN farms f ON f.id=se.farm_id ORDER BY se.active DESC,se.start_date DESC")
    .all() as Season[];

  return (
    <AppShell user={user}>
      <h1>ניהול חקלאים ועונות</h1>
      {saved && <p className="alert" role="status">נשמר בהצלחה</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="grid">
        <form className="card stack" action="/api/actions" method="post">
          <Hidden csrf={csrf} action="farmCreate" />
          <h2>חקלאי חדש</h2>
          <div className="field"><label htmlFor="farm-name">שם החקלאי</label><input className="input" id="farm-name" name="name" required maxLength={150} /></div>
          <div className="field"><label htmlFor="farm-contact">איש קשר</label><input className="input" id="farm-contact" name="contact" required maxLength={150} /></div>
          <div className="field"><label htmlFor="farm-phone">טלפון</label><input className="input" id="farm-phone" name="phone" required maxLength={30} /></div>
          <div className="field"><label htmlFor="farm-address">כתובת</label><input className="input" id="farm-address" name="address" required maxLength={300} /></div>
          <div className="field"><label htmlFor="farm-navigation">קישור ניווט (אופציונלי)</label><input className="input" id="farm-navigation" name="navigation" type="url" placeholder="https://" maxLength={500} /></div>
          <div className="field"><label htmlFor="farm-notes">הערות</label><textarea className="input" id="farm-notes" name="notes" maxLength={2000} /></div>
          <button className="btn">הוספת חקלאי</button>
        </form>
        <form className="card stack" action="/api/actions" method="post">
          <Hidden csrf={csrf} action="seasonCreate" />
          <h2>עונת גידול</h2>
          <div className="field">
            <label htmlFor="season-farm">חקלאי</label>
            <select className="input" id="season-farm" name="farmId" required>
              {farms.filter(f => f.active).map(f => <option value={f.id} key={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="season-crop">גידול</label><input className="input" id="season-crop" name="crop" required maxLength={150} /></div>
          <div className="field"><label htmlFor="season-start">מתאריך</label><input className="input" id="season-start" name="start" type="date" required /></div>
          <div className="field"><label htmlFor="season-end">עד תאריך</label><input className="input" id="season-end" name="end" type="date" required /></div>
          <div className="field"><label htmlFor="season-notes">הערות</label><textarea className="input" id="season-notes" name="notes" maxLength={2000} /></div>
          <button className="btn">הוספת עונה</button>
        </form>
      </div>

      <section className="card">
        <h2>חקלאים</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>שם</th><th>כתובת</th><th>מצב</th><th>פעולה</th></tr></thead>
            <tbody>
              {farms.map(x => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td>{x.address}</td>
                  <td><span className={`tag ${x.active ? "" : "bad"}`}>{x.active ? "פעיל" : "בארכיון"}</span></td>
                  <td><ActiveForm csrf={csrf} entity="FARM" id={x.id} active={!x.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>עונות</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>חקלאי</th><th>גידול</th><th>טווח</th><th>מצב</th><th>פעולה</th></tr></thead>
            <tbody>
              {seasons.map(x => (
                <tr key={x.id}>
                  <td>{x.farm}</td>
                  <td>{x.crop}</td>
                  <td>{formatHebrewDate(x.start_date)}–{formatHebrewDate(x.end_date)}</td>
                  <td><span className={`tag ${x.active ? "" : "bad"}`}>{x.active ? "פעילה" : "בארכיון"}</span></td>
                  <td><ActiveForm csrf={csrf} entity="SEASON" id={x.id} active={!x.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function ActiveForm({ csrf, entity, id, active }: { csrf: string; entity: "FARM" | "SEASON"; id: number; active: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="entityId" value={id} />
      <input type="hidden" name="active" value={active ? "1" : "0"} />
      {active ? (
        <button className="btn btn-sm secondary">שחזור</button>
      ) : (
        <button className="icon-btn danger" title="העברה לארכיון" aria-label="העברה לארכיון"><TrashIcon size={18} /></button>
      )}
    </form>
  );
}
