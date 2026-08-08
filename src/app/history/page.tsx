import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };
type HistoryRow = { id: number; date: string; slot: string; status: string; farm: string; crop: string };

export default async function History() {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;

  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.slot,s.status,f.name farm,se.crop FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id JOIN seasons se ON se.id=s.season_id JOIN farms f ON f.id=se.farm_id
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED','CANCELLED') AND (s.date<? OR s.status IN ('COMPLETED','CANCELLED'))
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

  return (
    <AppShell user={user}>
      <h1>היסטוריה וכמויות</h1>

      <div className="record-list mobile-only">
        {rows.map(x => (
          <article className="record-card" key={x.id}>
            <div className="record-card-head">
              <div className="record-card-body">
                <span className="record-card-name">{formatHebrewDate(x.date)} · {x.slot === "MORNING" ? "בוקר" : "ערב"}</span>
                <div className="record-card-meta">{x.farm} · {x.crop}</div>
              </div>
              <span className={`tag${x.status === "CANCELLED" ? " bad" : ""}`}>{STATUS_LABEL[x.status]}</span>
            </div>
            <div className="record-card-meta">כמות: {quantityText(x.id)}</div>
          </article>
        ))}
        {rows.length === 0 && <p className="muted">אין היסטוריה להצגה עדיין.</p>}
      </div>

      <div className="table-wrap card desktop-only">
        <table className="table">
          <thead><tr><th>תאריך</th><th>משמרת</th><th>חקלאי</th><th>גידול</th><th>מצב</th><th>כמות</th></tr></thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id}>
                <td>{formatHebrewDate(x.date)}</td>
                <td>{x.slot === "MORNING" ? "בוקר" : "ערב"}</td>
                <td>{x.farm}</td>
                <td>{x.crop}</td>
                <td><span className={`tag${x.status === "CANCELLED" ? " bad" : ""}`}>{STATUS_LABEL[x.status]}</span></td>
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
