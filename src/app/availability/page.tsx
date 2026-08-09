import { AppShell } from "@/components/nav";
import { AvailabilityPicker, type AvailabilityMonth } from "@/components/availability-picker";
import { csrfValue, db, requireUser } from "@/lib/server";
import { availabilityWindow, monthEditableDates, shiftMonthKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Availability({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const window = availabilityWindow();
  const firstMonthKey = window.start.slice(0, 7);
  const lastDay = new Date(`${window.end}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const lastMonthKey = lastDay.toISOString().slice(0, 7);

  const existing = db().prepare("SELECT date,status FROM availability WHERE user_id=? AND date>=? AND date<?").all(user.id, window.start, window.end) as { date: string; status: string }[];
  const map = new Map(existing.map(x => [x.date, x.status]));

  const months: AvailabilityMonth[] = [];
  for (let monthKey = firstMonthKey; monthKey <= lastMonthKey; monthKey = shiftMonthKey(monthKey, 1)) {
    const [year, month] = monthKey.split("-").map(Number) as [number, number];
    const editableDates = new Set(monthEditableDates(year, month, window));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = `${monthKey}-01`;
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${monthKey}-${String(day).padStart(2, "0")}`;
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      const locked = !editableDates.has(date);
      const status = (map.get(date) as "AVAILABLE" | "MAYBE" | "UNAVAILABLE" | undefined) ?? null;
      return { date, day, weekday, status, locked };
    });
    const label = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));
    months.push({ key: monthKey, label, days });
  }

  return (
    <AppShell user={user}>
      <h1>הזמינות שלי</h1>
      <p className="muted">ניתן לעדכן זמינות ל-60 הימים הבאים החל ממחר. נא לסמן תשובה לכל יום, כולל ימים שבהם אין כוונה לעבוד.</p>
      {saved && <p className="alert">הזמינות נשמרה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <AvailabilityPicker csrf={csrf} months={months} />
    </AppShell>
  );
}
