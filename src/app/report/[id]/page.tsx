import { notFound } from "next/navigation";
import { AppShell } from "@/components/nav";
import { csrfValue, db, requireUser } from "@/lib/server";
import { formatHebrewDate } from "@/lib/dates";
import type { Unit } from "@/lib/units";
import { UnitLines } from "@/components/unit-lines";

export const dynamic = "force-dynamic";

export default async function ReportOwnResults({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const shift = db()
    .prepare(
      `SELECT s.id,s.date,s.start_time,s.end_time,s.status,f.name farm,pf.fruit_type crop
       FROM shifts s JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       WHERE s.id=?`
    )
    .get(id) as { id: number; date: string; start_time: string; end_time: string; status: string; farm: string; crop: string } | undefined;
  const assigned = shift && db().prepare("SELECT 1 FROM shift_pickers WHERE shift_id=? AND user_id=?").get(id, user.id);
  if (!shift || !assigned || shift.status !== "PUBLISHED") notFound();

  const alreadyReported = db()
    .prepare("SELECT 1 FROM audit_events WHERE actor_id=? AND action='SELF_REPORT' AND entity_type='SHIFT' AND entity_id=?")
    .get(user.id, id);

  const csrf = await csrfValue();
  const quantities = db().prepare("SELECT quantity,unit FROM quantities WHERE shift_id=? AND user_id=?").all(id, user.id) as Array<{ quantity: number; unit: Unit }>;
  const hours = db().prepare("SELECT start_time,end_time FROM shift_hours WHERE shift_id=? AND user_id=?").get(id, user.id) as { start_time: string; end_time: string } | undefined;

  if (alreadyReported) {
    return (
      <AppShell user={user}>
        <h1>דיווח תוצאות · {formatHebrewDate(shift.date)}</h1>
        <div className="card stack">
          <p className="muted">{shift.farm} · {shift.crop}</p>
          <p>כבר דיווחת על משמרת זו. לא ניתן לעדכן דיווח שנשלח.</p>
          {hours && <p className="muted">שעות בפועל: <span dir="ltr" className="ltr-field">{hours.start_time}–{hours.end_time}</span></p>}
          {quantities.map((q, i) => <p key={i} className="muted">{q.quantity} {q.unit}</p>)}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <h1>דיווח תוצאות · {formatHebrewDate(shift.date)}</h1>
      <form className="card stack" action="/api/actions" method="post">
        <input type="hidden" name="action" value="selfReport" />
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="shiftId" value={id} />
        <p className="muted">{shift.farm} · {shift.crop} · <span className="muted">שעות מתוכננות:</span> <span dir="ltr" className="ltr-field">{shift.start_time}–{shift.end_time}</span></p>
        <div className="grid">
          <div className="field"><label htmlFor="report-hours-start">שעת התחלה בפועל</label><input className="input" id="report-hours-start" type="time" name="hoursStart" required defaultValue={hours?.start_time ?? ""} /></div>
          <div className="field"><label htmlFor="report-hours-end">שעת סיום בפועל</label><input className="input" id="report-hours-end" type="time" name="hoursEnd" required defaultValue={hours?.end_time ?? ""} /></div>
        </div>
        <UnitLines
          valueName="qty"
          unitName="unit"
          initial={quantities.map(q => ({ value: q.quantity, unit: q.unit }))}
          addLabel="הוספת שורת דיווח נוספת"
          valueLabel="כמות"
          unitLabel="יחידת מידה"
        />
        <button className="btn">שמירת הדיווח</button>
      </form>
    </AppShell>
  );
}
