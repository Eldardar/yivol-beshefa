import { HebrewCalendar, flags } from "@hebcal/core";

export type HolidayReligion = "jewish" | "christian" | "muslim";
export type Holiday = { date: string; name: string; religion: HolidayReligion };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Holidays worth surfacing on a work-shift calendar — excludes minor Israeli
// "value days" (Hebrew Language Day, Herzl Day, etc.) that hebcal also tags MODERN_HOLIDAY.
const JEWISH_ALLOWLIST = new Set([
  "Rosh Hashana", "Yom Kippur", "Sukkot", "Shmini Atzeret", "Pesach", "Pesach Sheni",
  "Shavuot", "Tu BiShvat", "Purim", "Shushan Purim", "Lag BaOmer", "Tu B'Av",
  "Tish'a B'Av", "Chanukah", "Yom HaShoah", "Yom HaZikaron", "Yom HaAtzma'ut",
  "Yom Yerushalayim", "Sigd", "Yom HaAliyah"
]);

function jewishHolidays(year: number, month: number): Holiday[] {
  const events = HebrewCalendar.calendar({
    year, month, isHebrewYear: false, il: true,
    noMinorFast: true, noRoshChodesh: true, noSpecialShabbat: true, noModern: false
  });
  const out: Holiday[] = [];
  for (const ev of events) {
    // hebcal flags the first Chanukah candle-lighting as EREV too — keep it, drop other "eve of" events.
    if (ev.getFlags() & flags.EREV && !(ev.getFlags() & flags.CHANUKAH_CANDLES)) continue;
    if (!JEWISH_ALLOWLIST.has(ev.basename())) continue;
    out.push({ date: ev.getDate().greg().toISOString().slice(0, 10), name: ev.render("he-x-NoNikud"), religion: "jewish" });
  }
  return out;
}

// Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for the Western Easter date.
function westernEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const CHRISTIAN_FIXED = [
  { month: 1, day: 6, name: "חג ההתגלות" },
  { month: 1, day: 7, name: "חג המולד (מזרחי)" },
  { month: 12, day: 25, name: "חג המולד" }
];

const EASTER_OFFSETS = [
  { offset: -46, name: "יום רביעי האפר" },
  { offset: -7, name: "יום ראשון של הדקלים" },
  { offset: -2, name: "יום שישי הטוב" },
  { offset: 0, name: "חג הפסחא" },
  { offset: 39, name: "יום העלייה השמימה" },
  { offset: 49, name: "חג השבועות הנוצרי" }
];

function christianHolidays(year: number, month: number): Holiday[] {
  const out: Holiday[] = [];
  for (const h of CHRISTIAN_FIXED) {
    if (h.month === month) out.push({ date: `${year}-${pad(month)}-${pad(h.day)}`, name: h.name, religion: "christian" });
  }
  const easter = westernEaster(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  for (const e of EASTER_OFFSETS) {
    const d = new Date(easterDate);
    d.setUTCDate(d.getUTCDate() + e.offset);
    if (d.getUTCMonth() + 1 === month) out.push({ date: d.toISOString().slice(0, 10), name: e.name, religion: "christian" });
  }
  return out;
}

// Tabular ("civil") Islamic calendar arithmetic — a fixed leap-year cycle, not
// actual moon sighting, so dates can land a day off from the officially observed one.
function leapGregorian(year: number): boolean {
  return year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0);
}
const GREGORIAN_EPOCH = 1721425.5;
function gregorianToJd(year: number, month: number, day: number): number {
  return (
    GREGORIAN_EPOCH - 1 +
    365 * (year - 1) +
    Math.floor((year - 1) / 4) -
    Math.floor((year - 1) / 100) +
    Math.floor((year - 1) / 400) +
    Math.floor((367 * month - 362) / 12 + (month <= 2 ? 0 : leapGregorian(year) ? -1 : -2) + day)
  );
}
const ISLAMIC_EPOCH = 1948439.5;
function islamicToJd(year: number, month: number, day: number): number {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;
}
function jdToIslamic(jdInput: number): [number, number, number] {
  const jd = Math.floor(jdInput) + 0.5;
  const year = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + islamicToJd(year, 1, 1))) / 29.5) + 1);
  const day = jd - islamicToJd(year, month, 1) + 1;
  return [year, month, day];
}

const MUSLIM_HOLIDAYS: Record<string, string> = {
  "1-1": "ראש השנה האסלאמי",
  "1-10": "עאשוראא",
  "3-12": "המולד הנבואי",
  "9-1": "תחילת חודש הרמדאן",
  "9-27": "ליל אלקדר",
  "10-1": "עיד אלפיטר",
  "12-9": "יום עראפה",
  "12-10": "עיד אלאדחא"
};

function muslimHolidays(year: number, month: number): Holiday[] {
  const out: Holiday[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const [, islamicMonth, islamicDay] = jdToIslamic(gregorianToJd(year, month, day));
    const name = MUSLIM_HOLIDAYS[`${islamicMonth}-${islamicDay}`];
    if (name) out.push({ date: `${year}-${pad(month)}-${pad(day)}`, name, religion: "muslim" });
  }
  return out;
}

export function getHolidays(year: number, month: number): Holiday[] {
  return [...jewishHolidays(year, month), ...christianHolidays(year, month), ...muslimHolidays(year, month)];
}
