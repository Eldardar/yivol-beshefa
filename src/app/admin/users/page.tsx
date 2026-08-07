import { AppShell } from "@/components/nav";
import { WorkersTable, type ShiftsByUser, type WorkerRow, type WorkerShiftRow } from "@/components/workers-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const users = database.prepare("SELECT id,name,email,phone,national_id,role,active FROM users ORDER BY id").all() as WorkerRow[];

  const today = jerusalemDate();
  const shiftRows = database.prepare(`
    SELECT sp.user_id user_id,s.id id,s.date date,s.slot slot,s.status status,f.name farm,se.crop crop,COALESCE(q.quantity,0) quantity
    FROM shift_pickers sp
    JOIN shifts s ON s.id=sp.shift_id
    JOIN seasons se ON se.id=s.season_id
    JOIN farms f ON f.id=se.farm_id
    LEFT JOIN quantities q ON q.shift_id=s.id AND q.user_id=sp.user_id
    WHERE s.status IN ('PUBLISHED','COMPLETED','CANCELLED')
    ORDER BY s.date DESC,s.slot
  `).all() as Array<WorkerShiftRow & { user_id: number }>;

  const shiftsByUser: ShiftsByUser = {};
  for (const { user_id, ...shift } of shiftRows) {
    const bucket = (shiftsByUser[user_id] ??= { past: [], future: [] });
    if (shift.date < today || shift.status !== "PUBLISHED") bucket.past.push(shift); else bucket.future.push(shift);
  }
  for (const bucket of Object.values(shiftsByUser)) bucket.future.reverse();

  return (
    <AppShell user={user}>
      <h1>ניהול עובדים</h1>
      {saved && <p className="alert">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <WorkersTable users={users} shiftsByUser={shiftsByUser} csrf={csrf} currentUserId={user.id} />
      </section>
    </AppShell>
  );
}
