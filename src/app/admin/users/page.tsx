import { AppShell } from "@/components/nav";
import { WorkersTable, type ShiftsByUser, type WorkerRow, type WorkerShiftRow } from "@/components/workers-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const users = database.prepare("SELECT id,name,email,phone,national_id,role,active FROM users ORDER BY id").all() as WorkerRow[];

  const today = jerusalemDate();
  const shiftRows = database.prepare(`
    SELECT sp.user_id user_id,s.id id,s.date date,s.slot slot,s.status status,f.name farm,se.crop crop
    FROM shift_pickers sp
    JOIN shifts s ON s.id=sp.shift_id
    JOIN seasons se ON se.id=s.season_id
    JOIN farms f ON f.id=se.farm_id
    WHERE s.status IN ('PUBLISHED','COMPLETED','CANCELLED')
    ORDER BY s.date DESC,s.slot
  `).all() as Array<Omit<WorkerShiftRow, "lines"> & { user_id: number }>;

  const quantityRows = database.prepare("SELECT shift_id,user_id,quantity,unit FROM quantities").all() as Array<{ shift_id: number; user_id: number; quantity: number; unit: Unit }>;
  const linesByShiftUser = new Map<string, Array<{ quantity: number; unit: Unit }>>();
  for (const q of quantityRows) {
    const key = `${q.shift_id}:${q.user_id}`;
    const arr = linesByShiftUser.get(key) ?? [];
    arr.push({ quantity: q.quantity, unit: q.unit });
    linesByShiftUser.set(key, arr);
  }

  const shiftsByUser: ShiftsByUser = {};
  for (const { user_id, ...shift } of shiftRows) {
    const bucket = (shiftsByUser[user_id] ??= { past: [], future: [] });
    const row: WorkerShiftRow = { ...shift, lines: linesByShiftUser.get(`${shift.id}:${user_id}`) ?? [] };
    if (shift.date < today || shift.status !== "PUBLISHED") bucket.past.push(row); else bucket.future.push(row);
  }
  for (const bucket of Object.values(shiftsByUser)) bucket.future.reverse();

  return (
    <AppShell user={user}>
      <h1>ניהול עובדים</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <WorkersTable users={users} shiftsByUser={shiftsByUser} csrf={csrf} currentUserId={user.id} />
      </section>
    </AppShell>
  );
}
