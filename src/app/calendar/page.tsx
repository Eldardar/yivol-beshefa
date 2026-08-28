import { AppShell } from "@/components/nav";
import { CalendarView, type CalendarDay, type CalendarShift } from "@/components/calendar-view";
import { db, requireUser } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type ShiftRow = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  leader: string;
  farm: string;
  address: string;
  navigation_link: string | null;
  fruit_type: string;
  fruit_subtype: string;
};

export default async function CalendarPage() {
  const user = await requireUser();

  const today = jerusalemDate();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart}T12:00:00Z`));

  const database = db();
  const shifts = database
    .prepare(
      `SELECT s.id,s.date,s.start_time,s.end_time,s.notes,u.name leader,f.name farm,f.address,f.navigation_link,pf.fruit_type,pf.fruit_subtype
       FROM shifts s JOIN users u ON u.id=s.leader_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       WHERE s.status='PUBLISHED' AND s.date>=? AND s.date<?
       ORDER BY s.date,s.start_time`
    )
    .all(monthStart, monthEnd) as ShiftRow[];

  const shiftIds = shifts.map(s => s.id);
  const pickersByShift = new Map<number, string[]>();
  const vehiclesByShift = new Map<number, { number: string; name: string }[]>();
  if (shiftIds.length > 0) {
    const placeholders = shiftIds.map(() => "?").join(",");
    const pickerRows = database
      .prepare(`SELECT sp.shift_id,u.name FROM shift_pickers sp JOIN users u ON u.id=sp.user_id WHERE sp.shift_id IN (${placeholders}) ORDER BY u.name`)
      .all(...shiftIds) as { shift_id: number; name: string }[];
    for (const p of pickerRows) {
      const list = pickersByShift.get(p.shift_id);
      if (list) list.push(p.name); else pickersByShift.set(p.shift_id, [p.name]);
    }
    const vehicleRows = database
      .prepare(`SELECT sv.shift_id,v.number,v.name FROM shift_vehicles sv JOIN vehicles v ON v.id=sv.vehicle_id WHERE sv.shift_id IN (${placeholders}) ORDER BY v.number`)
      .all(...shiftIds) as { shift_id: number; number: string; name: string }[];
    for (const v of vehicleRows) {
      const list = vehiclesByShift.get(v.shift_id);
      if (list) list.push({ number: v.number, name: v.name }); else vehiclesByShift.set(v.shift_id, [{ number: v.number, name: v.name }]);
    }
  }

  const monthNumber = today.slice(5, 7);
  const birthdayRows = database
    .prepare("SELECT name,substr(date_of_birth,9,2) day FROM users WHERE active=1 AND date_of_birth IS NOT NULL AND substr(date_of_birth,6,2)=?")
    .all(monthNumber) as { name: string; day: string }[];
  const birthdaysByDay = new Map<number, string[]>();
  for (const b of birthdayRows) {
    const day = Number(b.day);
    const list = birthdaysByDay.get(day);
    if (list) list.push(b.name); else birthdaysByDay.set(day, [b.name]);
  }

  const shiftsByDate = new Map<string, CalendarShift[]>();
  for (const s of shifts) {
    const shift: CalendarShift = {
      id: s.id,
      startTime: s.start_time,
      endTime: s.end_time,
      farm: s.farm,
      address: s.address,
      navigationLink: s.navigation_link,
      fruitType: s.fruit_type,
      fruitSubtype: s.fruit_subtype,
      leader: s.leader,
      notes: s.notes,
      pickers: pickersByShift.get(s.id) ?? [],
      vehicles: vehiclesByShift.get(s.id) ?? []
    };
    const list = shiftsByDate.get(s.date);
    if (list) list.push(shift); else shiftsByDate.set(s.date, [shift]);
  }

  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${monthStart.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    return { date, day, weekday, isToday: date === today, shifts: shiftsByDate.get(date) ?? [], birthdays: birthdaysByDay.get(day) ?? [] };
  });

  return (
    <AppShell user={user}>
      <h1>לוח חודשי</h1>
      <p className="muted">כל המשמרות שפורסמו לחודש {label}. יש ללחוץ על משמרת לצפייה בפרטים.</p>
      <CalendarView label={label} days={days} />
    </AppShell>
  );
}
