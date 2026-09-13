import Link from "next/link";
import { AppShell } from "@/components/nav";
import { db, requireUser, csrfValue } from "@/lib/server";
import { formatHebrewDate, jerusalemDate, jerusalemInstant } from "@/lib/dates";
import { MapPinIcon, TruckIcon } from "@/components/icons";
import { WorkerGoalButton } from "@/components/worker-goal-button";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

type AssignmentRow = { id: number; date: string; start_time: string; end_time: string; leader_id: number; farm: string; address: string; navigation_link: string | null; fruit_type: string; vehicles: string | null; reported: number };

export default async function Assignments() {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;

  const today = jerusalemDate();
  const csrf = await csrfValue();
  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.start_time,s.end_time,s.leader_id,f.name farm,f.address,f.navigation_link,pf.fruit_type,GROUP_CONCAT(v.name,', ') vehicles,
       EXISTS(SELECT 1 FROM audit_events WHERE actor_id=sp.user_id AND action='SELF_REPORT' AND entity_type='SHIFT' AND entity_id=s.id) reported
       FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id
       JOIN plantation_fields pf ON pf.id=s.plantation_field_id
       JOIN farms f ON f.id=pf.farm_id
       LEFT JOIN shift_vehicles sv ON sv.shift_id=s.id
       LEFT JOIN vehicles v ON v.id=sv.vehicle_id
       WHERE sp.user_id=? AND s.status='PUBLISHED'
       GROUP BY s.id ORDER BY s.date,s.start_time`
    )
    .all(user.id) as AssignmentRow[];

  const goalRows = db().prepare("SELECT shift_id,unit,goal FROM worker_goals WHERE user_id=?").all(user.id) as Array<{ shift_id: number; unit: Unit; goal: number }>;
  const goalsByShift = new Map<number, Array<{ value: number; unit: Unit }>>();
  for (const g of goalRows) {
    const arr = goalsByShift.get(g.shift_id) ?? [];
    arr.push({ value: g.goal, unit: g.unit });
    goalsByShift.set(g.shift_id, arr);
  }
  const allowedUnitRows = db().prepare("SELECT shift_id,unit FROM shift_goal_units").all() as Array<{ shift_id: number; unit: Unit }>;
  const allowedUnitsByShift = new Map<number, Unit[]>();
  for (const r of allowedUnitRows) {
    const arr = allowedUnitsByShift.get(r.shift_id) ?? [];
    arr.push(r.unit);
    allowedUnitsByShift.set(r.shift_id, arr);
  }
  const now = new Date();

  return (
    <AppShell user={user}>
      <h1>השיבוצים שלי</h1>
      <div className="grid">
        {rows.map(x => (
          <article className="card" key={x.id}>
            <span className="tag"><span dir="ltr">{x.start_time}–{x.end_time}</span></span>
            <h2>{formatHebrewDate(x.date)} · {x.farm}</h2>
            <p className="muted inline-icon-text"><MapPinIcon size={16} /><span>{x.fruit_type} · {x.address}</span></p>
            {x.vehicles && <p className="muted inline-icon-text"><TruckIcon size={16} /><span>{x.vehicles}</span></p>}
            <div className="row">
              {x.navigation_link && <a className="btn secondary" rel="noreferrer" target="_blank" href={x.navigation_link}>ניווט</a>}
              {x.leader_id === user.id && (
                x.date <= today
                  ? <Link className="btn" href={`/leader/${x.id}`}>דיווח כמויות</Link>
                  : <span className="btn" aria-disabled="true" title="הדיווח ייפתח ביום המשמרת">דיווח כמויות</span>
              )}
              {x.leader_id !== user.id && x.date <= today && (
                x.reported
                  ? <span className="btn secondary" aria-disabled="true" title="כבר דיווחת על משמרת זו">דיווח תוצאות אישי</span>
                  : <Link className="btn secondary" href={`/report/${x.id}`}>דיווח תוצאות אישי</Link>
              )}
              {jerusalemInstant(x.date, x.start_time) > now && (
                <WorkerGoalButton csrf={csrf} shiftId={x.id} existingGoal={goalsByShift.get(x.id) ?? []} allowedUnits={allowedUnitsByShift.get(x.id)} />
              )}
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="card muted">אין שיבוצים שפורסמו.</p>}
      </div>
    </AppShell>
  );
}
