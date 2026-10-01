import { AppShell } from "@/components/nav";
import { HousingAdminView, type HousingByWorker, type HousingDay, type HousingOverviewDay, type NamedWorker, type WorkerOption } from "@/components/housing-admin-view";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate, monthRange } from "@/lib/dates";
import { bookableVillages } from "@/lib/housing";

export const dynamic = "force-dynamic";

export default async function AdminHousing({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const database = db();
  const query = await searchParams;

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];
  const today = jerusalemDate();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const requestedMonth = Number(query.m);
  const year = Number.isInteger(Number(query.y)) && Number(query.y) >= 2000 && Number(query.y) <= 2100 ? Number(query.y) : todayYear;
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : todayMonth;
  const range = monthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${range.start}T12:00:00Z`));

  const rows = database
    .prepare(
      `SELECT h.date,h.user_id,h.status,o.id option_id,o.name option_name,v.name village_name,o.cost_per_day
       FROM housing_status h JOIN users u ON u.id=h.user_id
       LEFT JOIN village_sleeping_options o ON o.id=h.sleeping_option_id LEFT JOIN villages v ON v.id=o.village_id
       WHERE u.role='PICKER' AND u.active=1 AND h.date>=? AND h.date<?`
    )
    .all(range.start, range.end) as Array<{ date: string; user_id: number; status: "IN_VILLAGE" | "MAYBE" | "AWAY"; option_id: number | null; option_name: string | null; village_name: string | null; cost_per_day: number | null }>;

  const statusByDateUser = new Map<string, Map<number, "IN_VILLAGE" | "MAYBE" | "AWAY">>();
  const housingByWorker: HousingByWorker = {};
  for (const row of rows) {
    const byUser = statusByDateUser.get(row.date) ?? new Map();
    byUser.set(row.user_id, row.status);
    statusByDateUser.set(row.date, byUser);
    const option = row.option_id != null ? { id: row.option_id, name: row.option_name!, villageName: row.village_name!, costPerDay: row.cost_per_day! } : null;
    (housingByWorker[row.user_id] ??= {})[row.date] = { status: row.status, option };
  }
  const villages = bookableVillages(database, month);

  const days: HousingDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${range.start.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    return { date, day, weekday, isToday: date === today, isPast: date < today };
  });

  const overview: HousingOverviewDay[] = days.map(d => {
    const byUser = statusByDateUser.get(d.date);
    const workersByStatus = { inVillage: [] as NamedWorker[], maybe: [] as NamedWorker[], away: [] as NamedWorker[], noResponse: [] as NamedWorker[] };
    for (const w of workers) {
      const entry: NamedWorker = { id: w.id, name: w.name };
      const status = byUser?.get(w.id);
      if (status === "IN_VILLAGE") workersByStatus.inVillage.push(entry);
      else if (status === "MAYBE") workersByStatus.maybe.push(entry);
      else if (status === "AWAY") workersByStatus.away.push(entry);
      else workersByStatus.noResponse.push(entry);
    }
    return { date: d.date, day: d.day, weekday: d.weekday, isToday: d.isToday, workersByStatus };
  });

  return (
    <AppShell user={user}>
      <h1>ניהול שיבוצי מגורים</h1>
      <p className="muted">בחרו עובד/ת כדי לשבץ אותם לכפר ולאפשרות לינה בכל יום, או צפו בתצוגה החודשית המרוכזת.</p>
      <HousingAdminView csrf={csrf} workers={workers} year={year} month={month} label={label} days={days} overview={overview} housingByWorker={housingByWorker} villages={villages} />
    </AppShell>
  );
}
