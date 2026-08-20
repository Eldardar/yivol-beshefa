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
  const shift = db().prepare("SELECT id,date,slot,status,leader_id,start_hour,end_hour,team_leader_details FROM shifts WHERE id=?").get(id) as { id: number; date: string; slot: string; status: string; leader_id: number; start_hour: string | null; end_hour: string | null; team_leader_details: string } | undefined;
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

  return (
    <AppShell user={user}>
      <h1>דיווח כמויות · {formatHebrewDate(shift.date)}</h1>
      <form className="card stack" action="/api/actions" method="post">
        <input type="hidden" name="action" value="quantities" />
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="shiftId" value={id} />
        <div className="grid">
          <div className="field"><label htmlFor="report-start-hour">שעת התחלה</label><input className="input" id="report-start-hour" type="time" name="startHour" required defaultValue={shift.start_hour ?? ""} /></div>
          <div className="field"><label htmlFor="report-end-hour">שעת סיום</label><input className="input" id="report-end-hour" type="time" name="endHour" required defaultValue={shift.end_hour ?? ""} /></div>
        </div>
        <div className="field"><label htmlFor="report-leader-details">הערות מוביל המשמרת</label><textarea className="input" id="report-leader-details" name="teamLeaderDetails" maxLength={2000} defaultValue={shift.team_leader_details} /></div>
        {pickers.map(p => (
          <div className="field" key={p.id}>
            <span>{p.name}</span>
            <UnitLines valueName={`qty_${p.id}`} unitName={`unit_${p.id}`} initial={linesByUser.get(p.id) ?? []} addLabel={`הוספת שורת דיווח נוספת עבור ${p.name}`} valueLabel={`כמות · ${p.name}`} unitLabel={`יחידת מידה · ${p.name}`} />
          </div>
        ))}
        <button className="btn">שמירת הדיווח</button>
      </form>
    </AppShell>
  );
}
