import Link from "next/link";
import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import { MapPinIcon, TruckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type AssignmentRow = { id: number; date: string; slot: string; leader_id: number; farm: string; address: string; navigation_link: string | null; fruit_type: string; vehicles: string | null };

export default async function Assignments() {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;

  const today = jerusalemDate();
  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.slot,s.leader_id,f.name farm,f.address,f.navigation_link,pf.fruit_type,GROUP_CONCAT(v.name,', ') vehicles
       FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id
       JOIN plantation_fields pf ON pf.id=s.plantation_field_id
       JOIN farms f ON f.id=pf.farm_id
       LEFT JOIN shift_vehicles sv ON sv.shift_id=s.id
       LEFT JOIN vehicles v ON v.id=sv.vehicle_id
       WHERE sp.user_id=? AND s.status='PUBLISHED' AND s.date>=?
       GROUP BY s.id ORDER BY s.date,s.slot`
    )
    .all(user.id, jerusalemDate()) as AssignmentRow[];

  return (
    <AppShell user={user}>
      <h1>השיבוצים שלי</h1>
      <div className="grid">
        {rows.map(x => (
          <article className="card" key={x.id}>
            <span className="tag">{x.slot === "MORNING" ? "בוקר" : "ערב"}</span>
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
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="card muted">אין שיבוצים קרובים שפורסמו.</p>}
      </div>
    </AppShell>
  );
}
