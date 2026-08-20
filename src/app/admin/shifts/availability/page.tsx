import { AppShell } from "@/components/nav";
import { WorkerAvailabilityView, type AvailabilityDay, type WorkerOption, type AvailabilityByWorker } from "@/components/worker-availability-view";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { ADMIN_AVAILABILITY_DAYS, adminAvailabilityWindow, jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ShiftsAvailability() {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const database = db();

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];

  const window = adminAvailabilityWindow();
  const today = jerusalemDate();
  const rows = database
    .prepare("SELECT user_id,date,status FROM availability WHERE date>=? AND date<?")
    .all(window.start, window.end) as Array<{ user_id: number; date: string; status: "AVAILABLE" | "MAYBE" | "UNAVAILABLE" }>;

  const availabilityByWorker: AvailabilityByWorker = {};
  for (const row of rows) (availabilityByWorker[row.user_id] ??= {})[row.date] = row.status;

  const [year, month, day] = window.start.split("-").map(Number) as [number, number, number];
  const days: AvailabilityDay[] = Array.from({ length: ADMIN_AVAILABILITY_DAYS }, (_, i) => new Date(Date.UTC(year, month - 1, day + i)))
    .filter(d => d.getUTCDay() !== 6)
    .map(d => ({ date: d.toISOString().slice(0, 10), day: d.getUTCDate(), isToday: d.toISOString().slice(0, 10) === today }));
  const leadingPad = days.length ? new Date(`${days[0]!.date}T12:00:00Z`).getUTCDay() : 0;

  return (
    <AppShell user={user}>
      <h1>זמינות עובדים</h1>
      <WorkerAvailabilityView workers={workers} days={days} leadingPad={leadingPad} availabilityByWorker={availabilityByWorker} csrf={csrf} />
    </AppShell>
  );
}
