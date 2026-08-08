import Link from "next/link";
import { AppShell } from "@/components/nav";
import { db, requireAdmin } from "@/lib/server";
import { formatHebrewDate, nextJerusalemMonth } from "@/lib/dates";
import { ClipboardListIcon, UsersIcon, SproutIcon, TruckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const AVAILABILITY_LABEL: Record<string, string> = { AVAILABLE: "רוצה לעבוד", MAYBE: "אולי" };

export default async function Admin() {
  const user = await requireAdmin();
  const database = db();
  const month = nextJerusalemMonth();
  const availability = database
    .prepare(`SELECT u.name,a.date,a.status FROM availability a JOIN users u ON u.id=a.user_id WHERE a.date>=? AND a.date<? ORDER BY a.date,u.name LIMIT 100`)
    .all(month.start, month.end) as Array<{ name: string; date: string; status: string }>;

  return (
    <AppShell user={user}>
      <section className="hero">
        <h1>מרכז התפעול</h1>
        <p>זמינות, משמרות ומשאבים במקום אחד</p>
      </section>
      <div className="grid">
        <Link className="card" href="/admin/shifts">
          <ClipboardListIcon size={22} className="muted" />
          <h2>משמרות</h2>
          <p className="muted">יצירה, פרסום, ביטול ודיווח</p>
        </Link>
        <Link className="card" href="/admin/users">
          <UsersIcon size={22} className="muted" />
          <h2>עובדים</h2>
          <p className="muted">ניהול חשבונות ופרופילים</p>
        </Link>
        <Link className="card" href="/admin/resources">
          <SproutIcon size={22} className="muted" />
          <h2>חקלאים ועונות</h2>
        </Link>
        <Link className="card" href="/admin/transport">
          <TruckIcon size={22} className="muted" />
          <h2>תחבורה</h2>
        </Link>
      </div>
      <h2>זמינות בחודש הבא</h2>
      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>קוטף</th>
              <th>מצב</th>
            </tr>
          </thead>
          <tbody>
            {availability.map((a, i) => (
              <tr key={i}>
                <td>{formatHebrewDate(a.date)}</td>
                <td>{a.name}</td>
                <td>{AVAILABILITY_LABEL[a.status] ?? "מנוחה"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!availability.length && <p className="muted">טרם דווחה זמינות.</p>}
      </div>
    </AppShell>
  );
}
