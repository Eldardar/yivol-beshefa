import { HousingCalendar, type HousingDay, type BookedOption } from "@/components/housing-calendar";
import { csrfValue, db } from "@/lib/server";
import { housingEditable, jerusalemDate } from "@/lib/dates";
import { bookableVillages } from "@/lib/housing";

type HousingRow = { date: string; status: "IN_VILLAGE" | "MAYBE" | "AWAY"; option_id: number | null; option_name: string | null; village_name: string | null; cost_per_day: number | null };

export async function HousingAvailabilityTab({ userId, y, m }: { userId: number; y?: string; m?: string }) {
  const csrf = await csrfValue();

  const today = jerusalemDate();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const requestedMonth = Number(m);
  const year = Number.isInteger(Number(y)) && Number(y) >= 2000 && Number(y) <= 2100 ? Number(y) : todayYear;
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : todayMonth;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));

  const database = db();
  const rows = database.prepare(`SELECT h.date,h.status,o.id option_id,o.name option_name,v.name village_name,o.cost_per_day
    FROM housing_status h LEFT JOIN village_sleeping_options o ON o.id=h.sleeping_option_id LEFT JOIN villages v ON v.id=o.village_id
    WHERE h.user_id=? AND h.date>=? AND h.date<?`).all(userId, monthStart, monthEnd) as HousingRow[];
  const map = new Map(rows.map(r => [r.date, r]));

  const villages = bookableVillages(database, month);

  const days: HousingDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${monthStart.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const row = map.get(date);
    const option: BookedOption | null = row?.option_id != null ? { id: row.option_id, name: row.option_name!, villageName: row.village_name!, costPerDay: row.cost_per_day! } : null;
    return { date, day, weekday, isToday: date === today, locked: !housingEditable(date), status: row?.status ?? null, option };
  });

  return (
    <>
      <p className="muted">בחרו כפר ואפשרות לינה, ואז עדכנו את סידור השינה שלכם לכל יום. ניתן לעדכן את היום הנוכחי עד השעה 18:00.</p>
      <HousingCalendar key={`${year}-${month}`} csrf={csrf} year={year} month={month} label={label} days={days} villages={villages} />
    </>
  );
}
