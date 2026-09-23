import { AppShell } from "@/components/nav";
import { HousingCalendar, type HousingDay } from "@/components/housing-calendar";
import { csrfValue, db, requireUser } from "@/lib/server";
import { housingEditable, jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Housing({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const csrf = await csrfValue();
  const query = await searchParams;

  const today = jerusalemDate();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const requestedMonth = Number(query.m);
  const year = Number.isInteger(Number(query.y)) && Number(query.y) >= 2000 && Number(query.y) <= 2100 ? Number(query.y) : todayYear;
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : todayMonth;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));

  const rows = db().prepare("SELECT date,status FROM housing_status WHERE user_id=? AND date>=? AND date<?").all(user.id, monthStart, monthEnd) as { date: string; status: "IN_VILLAGE" | "MAYBE" | "AWAY" }[];
  const map = new Map(rows.map(r => [r.date, r.status]));

  const days: HousingDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${monthStart.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    return { date, day, weekday, isToday: date === today, locked: !housingEditable(date), status: map.get(date) ?? null };
  });

  return (
    <AppShell user={user}>
      <h1>מגורים</h1>
      <p className="muted">עדכנו את סידור השינה שלכם לכל יום. ניתן לעדכן את היום הנוכחי עד השעה 18:00.</p>
      <HousingCalendar key={`${year}-${month}`} csrf={csrf} year={year} month={month} label={label} days={days} />
    </AppShell>
  );
}
