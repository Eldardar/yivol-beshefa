import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };
type HistoryRow = { id: number; date: string; status: string; farm: string; crop: string; start_time: string | null; end_time: string | null };

export default async function History() {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;

  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.status,f.name farm,pf.fruit_type crop,sh.start_time,sh.end_time FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       LEFT JOIN shift_hours sh ON sh.shift_id=s.id AND sh.user_id=sp.user_id
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND (s.date<? OR s.status='COMPLETED')
       ORDER BY s.date DESC`
    )
    .all(user.id, jerusalemDate()) as HistoryRow[];

  const quantityRows = db().prepare("SELECT shift_id,quantity,unit FROM quantities WHERE user_id=?").all(user.id) as Array<{ shift_id: number; quantity: number; unit: Unit }>;
  const quantitiesByShift = new Map<number, Array<{ quantity: number; unit: Unit }>>();
  for (const q of quantityRows) {
    const arr = quantitiesByShift.get(q.shift_id) ?? [];
    arr.push({ quantity: q.quantity, unit: q.unit });
    quantitiesByShift.set(q.shift_id, arr);
  }
  const quantityText = (id: number) => {
    const lines = quantitiesByShift.get(id) ?? [];
    return lines.length ? lines.map(l => `${l.quantity} ${UNIT_LABEL[l.unit]}`).join(" · ") : "—";
  };
  const hoursText = (x: HistoryRow) => (x.start_time && x.end_time ? `${x.start_time}–${x.end_time}` : "—");

  return (
    <AppShell user={user}>
      <h1>היסטוריה וכמויות</h1>

      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>תאריך</th><th>חקלאי</th><th>גידול</th><th>מצב</th><th>שעות</th><th>כמות</th></tr></thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id}>
                <td>{formatHebrewDate(x.date)}</td>
                <td>{x.farm}</td>
                <td>{x.crop}</td>
                <td><span className={`tag${x.status === "CANCELLED" ? " bad" : ""}`}>{STATUS_LABEL[x.status]}</span></td>
                <td><span dir="ltr" className="ltr-field">{hoursText(x)}</span></td>
                <td>{quantityText(x.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">אין היסטוריה להצגה עדיין.</p>}
      </div>
    </AppShell>
  );
}
