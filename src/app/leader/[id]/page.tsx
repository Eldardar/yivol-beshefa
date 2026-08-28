import { notFound } from "next/navigation";
import { AppShell } from "@/components/nav";
import { csrfValue, db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import type { Unit } from "@/lib/units";
import { UnitLines } from "@/components/unit-lines";

export const dynamic = "force-dynamic";

export default async function Leader({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const shift = db().prepare("SELECT id,date,start_time,end_time,status,leader_id,team_leader_details FROM shifts WHERE id=?").get(id) as { id: number; date: string; start_time: string; end_time: string; status: string; leader_id: number; team_leader_details: string } | undefined;
  if (!shift || shift.status !== "PUBLISHED" || (user.role !== "ADMIN" && shift.leader_id !== user.id)) notFound();
  if (user.role !== "ADMIN" && shift.date > jerusalemDate()) notFound();

  const csrf = await csrfValue();
  const pickers = db().prepare(`SELECT u.id,u.name FROM shift_pickers sp JOIN users u ON u.id=sp.user_id WHERE sp.shift_id=? ORDER BY u.name`).all(id) as Array<{ id: number; name: string }>;
  const quantities = db().prepare("SELECT user_id,quantity,unit FROM quantities WHERE shift_id=?").all(id) as Array<{ user_id: number; quantity: number; unit: Unit }>;
  const linesByUser = new Map<number, Array<{ value: number; unit: Unit }>>();
  for (const q of quantities) {
    const arr = linesByUser.get(q.user_id) ?? [];
    arr.push({ value: q.quantity, unit: q.unit });
    linesByUser.set(q.user_id, arr);
  }
  const hoursRows = db().prepare("SELECT user_id,start_time,end_time FROM shift_hours WHERE shift_id=?").all(id) as Array<{ user_id: number; start_time: string; end_time: string }>;
  const hoursByUser = new Map<number, { start_time: string; end_time: string }>();
  for (const h of hoursRows) hoursByUser.set(h.user_id, h);

  return (
    <AppShell user={user}>
      <h1>דיווח כמויות · {formatHebrewDate(shift.date)}</h1>
      <form className="card stack" action="/api/actions" method="post">
        <input type="hidden" name="action" value="quantities" />
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="shiftId" value={id} />
        <p className="muted">שעות מתוכננות: <span dir="ltr" className="ltr-field">{shift.start_time}–{shift.end_time}</span></p>
        <div className="field"><label htmlFor="report-leader-details">הערות מוביל המשמרת</label><textarea className="input" id="report-leader-details" name="teamLeaderDetails" maxLength={2000} defaultValue={shift.team_leader_details} /></div>
        {pickers.map(p => {
          const hours = hoursByUser.get(p.id);
          return (
            <div className="field" key={p.id}>
              <span>{p.name}</span>
              <div className="grid">
                <div className="field"><label htmlFor={`hours-start-${p.id}`}>שעת התחלה · {p.name}</label><input className="input" id={`hours-start-${p.id}`} type="time" name={`hoursStart_${p.id}`} required defaultValue={hours?.start_time ?? shift.start_time} /></div>
                <div className="field"><label htmlFor={`hours-end-${p.id}`}>שעת סיום · {p.name}</label><input className="input" id={`hours-end-${p.id}`} type="time" name={`hoursEnd_${p.id}`} required defaultValue={hours?.end_time ?? shift.end_time} /></div>
              </div>
              <UnitLines valueName={`qty_${p.id}`} unitName={`unit_${p.id}`} initial={linesByUser.get(p.id) ?? []} addLabel={`הוספת שורת דיווח נוספת עבור ${p.name}`} valueLabel={`כמות · ${p.name}`} unitLabel={`יחידת מידה · ${p.name}`} />
            </div>
          );
        })}
        <button className="btn">שמירת הדיווח</button>
      </form>
    </AppShell>
  );
}
