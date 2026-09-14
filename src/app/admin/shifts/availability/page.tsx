import { AppShell } from "@/components/nav";
import {
  WorkerAvailabilityView,
  type AvailabilityMonth,
  type WorkerOption,
  type AvailabilityByWorker,
  type AvailabilityOverviewDay
} from "@/components/worker-availability-view";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { adminWorkerAvailabilityWindow, jerusalemDate, monthRange, shiftMonthKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ShiftsAvailability({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const database = db();
  const query = await searchParams;

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];
  const today = jerusalemDate();

  // Monthly overview: how many active workers filled each status per day.
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const requestedMonth = Number(query.m);
  const year = Number.isInteger(Number(query.y)) && Number(query.y) >= 2000 && Number(query.y) <= 2100 ? Number(query.y) : todayYear;
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : todayMonth;
  const overviewRange = monthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const overviewLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${overviewRange.start}T12:00:00Z`));

  const countRows = database
    .prepare(
      `SELECT a.date,a.status,COUNT(*) cnt FROM availability a JOIN users u ON u.id=a.user_id
       WHERE u.role='PICKER' AND u.active=1 AND a.date>=? AND a.date<? GROUP BY a.date,a.status`
    )
    .all(overviewRange.start, overviewRange.end) as Array<{ date: string; status: "AVAILABLE" | "MAYBE" | "UNAVAILABLE"; cnt: number }>;
  const countsByDate = new Map<string, { available: number; maybe: number; unavailable: number }>();
  for (const row of countRows) {
    const entry = countsByDate.get(row.date) ?? { available: 0, maybe: 0, unavailable: 0 };
    if (row.status === "AVAILABLE") entry.available = row.cnt;
    else if (row.status === "MAYBE") entry.maybe = row.cnt;
    else entry.unavailable = row.cnt;
    countsByDate.set(row.date, entry);
  }

  const overviewDays: AvailabilityOverviewDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${overviewRange.start.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const counts = countsByDate.get(date) ?? { available: 0, maybe: 0, unavailable: 0 };
    const noResponse = workers.length - counts.available - counts.maybe - counts.unavailable;
    return { date, day: i + 1, weekday, isToday: date === today, counts: { ...counts, noResponse } };
  }).filter(d => d.weekday !== 6);

  // Per-worker editing: 1 month back through 2 months ahead, admins fill in on a worker's behalf.
  const window = adminWorkerAvailabilityWindow();
  const rows = database
    .prepare("SELECT user_id,date,status FROM availability WHERE date>=? AND date<?")
    .all(window.start, window.end) as Array<{ user_id: number; date: string; status: "AVAILABLE" | "MAYBE" | "UNAVAILABLE" }>;

  const availabilityByWorker: AvailabilityByWorker = {};
  for (const row of rows) (availabilityByWorker[row.user_id] ??= {})[row.date] = row.status;

  const firstMonthKey = window.start.slice(0, 7);
  const lastDay = new Date(`${window.end}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const lastMonthKey = lastDay.toISOString().slice(0, 7);

  const months: AvailabilityMonth[] = [];
  for (let monthKey = firstMonthKey; monthKey <= lastMonthKey; monthKey = shiftMonthKey(monthKey, 1)) {
    const [mYear, mMonth] = monthKey.split("-").map(Number) as [number, number];
    const monthDaysInMonth = new Date(Date.UTC(mYear, mMonth, 0)).getUTCDate();
    const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthKey}-01T12:00:00Z`));
    const monthDays = Array.from({ length: monthDaysInMonth }, (_, i) => {
      const date = `${monthKey}-${String(i + 1).padStart(2, "0")}`;
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      return { date, day: i + 1, weekday, isToday: date === today, isPast: date < today };
    });
    months.push({ key: monthKey, label: monthLabel, days: monthDays });
  }

  return (
    <AppShell user={user}>
      <h1>זמינות עובדים</h1>
      <WorkerAvailabilityView
        workers={workers}
        months={months}
        availabilityByWorker={availabilityByWorker}
        csrf={csrf}
        overview={{ year, month, label: overviewLabel, days: overviewDays }}
      />
    </AppShell>
  );
}
