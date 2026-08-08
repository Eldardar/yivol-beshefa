import Link from "next/link";
import { AppShell } from "@/components/nav";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { formatHebrewDate } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { UnitLines } from "@/components/unit-lines";

export const dynamic = "force-dynamic";

type Picker = { id: number; name: string };
type Season = { id: number; crop: string; farm: string };
type Vehicle = { id: number; name: string; number: string };
type ShiftRow = { id: number; date: string; slot: "MORNING" | "EVENING"; status: string; notes: string; season_id: number; leader_id: number; leader: string; farm: string; crop: string; picker_count: number };

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };

export default async function Shifts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string; edit?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;
  const database = db();

  const pickers = database.prepare("SELECT id,name FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as Picker[];
  const seasons = database.prepare("SELECT se.id,se.crop,f.name farm FROM seasons se JOIN farms f ON f.id=se.farm_id WHERE se.active=1 AND f.active=1 ORDER BY se.start_date DESC").all() as Season[];
  const vehicles = database.prepare("SELECT id,name,number FROM vehicles WHERE active=1 ORDER BY name").all() as Vehicle[];
  const shifts = database
    .prepare(
      `SELECT s.id,s.date,s.slot,s.status,s.notes,s.season_id,s.leader_id,u.name leader,f.name farm,se.crop,(SELECT COUNT(*) FROM shift_pickers WHERE shift_id=s.id) picker_count
       FROM shifts s JOIN users u ON u.id=s.leader_id JOIN seasons se ON se.id=s.season_id JOIN farms f ON f.id=se.farm_id
       ORDER BY s.date DESC,s.slot LIMIT 100`
    )
    .all() as ShiftRow[];

  const goalRows = database.prepare("SELECT shift_id,unit,goal FROM shift_goals").all() as Array<{ shift_id: number; unit: Unit; goal: number }>;
  const producedRows = database.prepare("SELECT shift_id,unit,SUM(quantity) produced FROM quantities GROUP BY shift_id,unit").all() as Array<{ shift_id: number; unit: Unit; produced: number }>;
  const unitsByShift = new Map<number, Map<Unit, { unit: Unit; goal: number; produced: number }>>();
  for (const g of goalRows) {
    const m = unitsByShift.get(g.shift_id) ?? new Map();
    m.set(g.unit, { unit: g.unit, goal: g.goal, produced: 0 });
    unitsByShift.set(g.shift_id, m);
  }
  for (const p of producedRows) {
    const m = unitsByShift.get(p.shift_id) ?? new Map();
    const existing = m.get(p.unit);
    if (existing) existing.produced = p.produced; else m.set(p.unit, { unit: p.unit, goal: 0, produced: p.produced });
    unitsByShift.set(p.shift_id, m);
  }

  const editId = Number(query.edit);
  const edit = Number.isSafeInteger(editId) ? shifts.find(x => x.id === editId) : undefined;
  const selectedPickers = edit ? (database.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=?").all(edit.id) as Array<{ user_id: number }>).map(x => String(x.user_id)) : [];
  const selectedVehicles = edit ? (database.prepare("SELECT vehicle_id FROM shift_vehicles WHERE shift_id=?").all(edit.id) as Array<{ vehicle_id: number }>).map(x => String(x.vehicle_id)) : [];
  const editGoals = edit ? [...(unitsByShift.get(edit.id)?.values() ?? [])].map(x => ({ value: x.goal, unit: x.unit })) : [];

  return (
    <AppShell user={user}>
      <h1>ניהול משמרות</h1>
      {query.saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {query.warning && <p className="alert" role="alert">אזהרה: {query.warning}</p>}
      {query.error && <p className="alert" role="alert">{query.error}</p>}

      <form key={edit ? `edit-${edit.id}` : "new"} className="card stack" action="/api/actions" method="post">
        <h2>{edit ? `עריכת משמרת ${edit.id}` : "משמרת חדשה"}</h2>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="action" value={edit ? "shiftUpdate" : "shiftCreate"} />
        {edit && <input type="hidden" name="shiftId" value={edit.id} />}
        <div className="grid">
          <div className="field"><label htmlFor="shift-date">תאריך</label><input className="input" id="shift-date" type="date" name="date" required defaultValue={edit?.date} /></div>
          <div className="field">
            <label htmlFor="shift-slot">חלק יום</label>
            <select className="input" id="shift-slot" name="slot" defaultValue={edit?.slot ?? "MORNING"}>
              <option value="MORNING">בוקר</option>
              <option value="EVENING">ערב</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="shift-season">עונה</label>
            <select className="input" id="shift-season" name="seasonId" required defaultValue={edit ? String(edit.season_id) : undefined}>
              {seasons.map(s => <option value={s.id} key={s.id}>{s.farm} · {s.crop}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="shift-leader">מוביל משמרת</label>
            <select className="input" id="shift-leader" name="leaderId" required defaultValue={edit ? String(edit.leader_id) : undefined}>
              {pickers.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="shift-pickers">קוטפים (בחירה מרובה)</label>
            <select className="input" id="shift-pickers" name="pickerIds" multiple required defaultValue={selectedPickers} size={Math.min(8, Math.max(3, pickers.length))}>
              {pickers.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="shift-vehicles">רכבים (בחירה מרובה)</label>
            <select className="input" id="shift-vehicles" name="vehicleIds" multiple defaultValue={selectedVehicles} size={Math.min(6, Math.max(2, vehicles.length))}>
              {vehicles.map(v => <option value={v.id} key={v.id}>{v.number} · {v.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <span>יעד</span>
          <UnitLines valueName="goalQty" unitName="goalUnit" initial={editGoals} addLabel="הוספת יעד נוסף" valueLabel="יעד" unitLabel="יחידת מידה ליעד" />
        </div>
        <div className="field"><label htmlFor="shift-notes">הערות</label><textarea className="input" id="shift-notes" name="notes" maxLength={4000} defaultValue={edit?.notes} /></div>
        <div className="actions">
          <button className="btn">{edit ? "שמירת שינויים" : "יצירת טיוטה"}</button>
          {edit && <Link className="btn secondary" href="/admin/shifts">ביטול עריכה</Link>}
        </div>
      </form>

      <section className="card">
        <h2>משמרות</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>תאריך</th><th>חלק יום</th><th>חקלאי וגידול</th><th>מוביל משמרת</th><th>קוטפים</th><th>יעד / בפועל</th><th>מצב</th><th>פעולות</th></tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const units = [...(unitsByShift.get(s.id)?.values() ?? [])];
                return (
                  <tr key={s.id}>
                    <td>{formatHebrewDate(s.date)}</td>
                    <td>{s.slot === "MORNING" ? "בוקר" : "ערב"}</td>
                    <td>{s.farm} · {s.crop}</td>
                    <td>{s.leader}</td>
                    <td>{s.picker_count}</td>
                    <td>{units.length ? units.map(u => `${u.produced} / ${u.goal} ${UNIT_LABEL[u.unit]}`).join(" · ") : "—"}</td>
                    <td><span className={`tag${s.status === "CANCELLED" ? " bad" : s.status === "DRAFT" ? " warn" : ""}`}>{STATUS_LABEL[s.status]}</span></td>
                    <td>
                      <div className="actions">
                        {["DRAFT", "PUBLISHED"].includes(s.status) && <Link className="btn secondary" href={`/admin/shifts?edit=${s.id}`}>עריכה</Link>}
                        {s.status === "PUBLISHED" && <Link className="btn secondary" href={`/leader/${s.id}`}>דוח</Link>}
                        {s.status === "DRAFT" && <Transition csrf={csrf} id={s.id} target="PUBLISHED" label="פרסום" />}
                        {s.status === "PUBLISHED" && (
                          <>
                            <Transition csrf={csrf} id={s.id} target="COMPLETED" label="סיום" />
                            <Transition csrf={csrf} id={s.id} target="DRAFT" label="החזרה לטיוטה" />
                          </>
                        )}
                        {!["COMPLETED", "CANCELLED"].includes(s.status) && <Transition csrf={csrf} id={s.id} target="CANCELLED" label="ביטול" danger />}
                        {s.status === "CANCELLED" && <Transition csrf={csrf} id={s.id} target="DRAFT" label="שחזור לטיוטה" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Transition({ csrf, id, target, label, danger }: { csrf: string; id: number; target: string; label: string; danger?: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="shiftTransition" />
      <input type="hidden" name="shiftId" value={id} />
      <input type="hidden" name="target" value={target} />
      <button className={`btn${danger ? " danger" : " secondary"}`}>{label}</button>
    </form>
  );
}
