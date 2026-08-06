import { AppShell } from "@/components/nav";
import { AvailabilityPicker, type AvailabilityDay } from "@/components/availability-picker";
import { csrfValue, db, requireUser } from "@/lib/server";
import { availabilityWindow, jerusalemDate, monthEditableDates, shiftMonthKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Availability({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; month?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const csrf = await csrfValue();
  const { saved, error, month: monthParam } = await searchParams;
  const window = availabilityWindow();
  const firstMonthKey = jerusalemDate().slice(0, 7);
  const lastDay = new Date(`${window.end}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const lastMonthKey = lastDay.toISOString().slice(0, 7);
  const requestedKey = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : firstMonthKey;
  const monthKey = requestedKey < firstMonthKey ? firstMonthKey : requestedKey > lastMonthKey ? lastMonthKey : requestedKey;
  const [year, month] = monthKey.split("-").map(Number) as [number, number];

  const editableDates = new Set(monthEditableDates(year, month, window));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${shiftMonthKey(monthKey, 1)}-01`;
  const existing = db().prepare("SELECT date,status FROM availability WHERE user_id=? AND date>=? AND date<?").all(user.id, monthStart, monthEnd) as { date: string; status: string }[];
  const map = new Map(existing.map(x => [x.date, x.status]));
  const days: AvailabilityDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const locked = !editableDates.has(date);
    const status = (map.get(date) as "AVAILABLE" | "MAYBE" | "UNAVAILABLE" | undefined) ?? null;
    return { date, day, weekday, status, locked };
  });
  const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));
  const prevKey = shiftMonthKey(monthKey, -1);
  const nextKey = shiftMonthKey(monthKey, 1);
  const hasPrev = prevKey >= firstMonthKey;
  const hasNext = nextKey <= lastMonthKey;

  return (
    <AppShell user={user}>
      <h1>הזמינות שלי</h1>
      <p className="muted">ניתן לעדכן זמינות ל-60 הימים הבאים החל ממחר. נא לסמן תשובה לכל יום, כולל ימים שבהם אין כוונה לעבוד.</p>
      {saved && <p className="alert">הזמינות נשמרה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <AvailabilityPicker csrf={csrf} days={days} monthLabel={monthLabel} prevKey={prevKey} nextKey={nextKey} hasPrev={hasPrev} hasNext={hasNext} />
    </AppShell>
  );
}
