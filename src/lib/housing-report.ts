import type Database from "better-sqlite3";
import { HEBREW_MONTHS, monthRange, yearRange } from "@/lib/dates";

// תקופת התצוגה בדוח המגורים — נגזרת מפרמטרי ה-URL
export type HousingReportView = "all" | "yearly" | "monthly";
export const HOUSING_REPORT_VIEWS: { key: HousingReportView; label: string }[] = [
  { key: "all", label: "כל הזמנים" },
  { key: "yearly", label: "שנתי" },
  { key: "monthly", label: "חודשי" }
];
export type HousingReportPeriod = {
  view: HousingReportView;
  year: number;
  month: number;
  // end אינו כלול; טווח חסר = ללא הגבלה
  range: { start?: string; end?: string };
  label: string;
  fileLabel: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function resolveHousingReportPeriod(query: { view?: string; y?: string; m?: string }, today: string): HousingReportPeriod {
  const view = HOUSING_REPORT_VIEWS.some(v => v.key === query.view) ? (query.view as HousingReportView) : "all";
  const y = Number(query.y);
  const m = Number(query.m);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : Number(today.slice(0, 4));
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : Number(today.slice(5, 7));

  const base = { view, year, month };
  switch (view) {
    case "yearly":
      return { ...base, range: yearRange(year), label: String(year), fileLabel: String(year) };
    case "monthly":
      return { ...base, range: monthRange(year, month), label: `${HEBREW_MONTHS[month - 1]} ${year}`, fileLabel: `${pad(month)}-${year}` };
    default:
      return { ...base, range: {}, label: "כל הזמנים", fileLabel: "כל הזמנים" };
  }
}

export type HousingReportRow = { user_id: number; name: string; active: number; nights: number; cost: number; unpriced_nights: number };

/**
 * לילות ועלות לכל עובד/ת בטווח: לילה נספר כשהסטטוס הוא "ישן בכפר",
 * ועלותו היא עלות אפשרות הלינה שנבחרה לאותו לילה (לילה ללא אפשרות לינה נספר בלי עלות).
 */
export function getHousingReport(db: Database.Database, range: { start?: string; end?: string }): HousingReportRow[] {
  return db
    .prepare(
      `SELECT u.id user_id,u.name,u.active,COUNT(*) nights,COALESCE(SUM(o.cost_per_day),0) cost,
         SUM(CASE WHEN o.id IS NULL THEN 1 ELSE 0 END) unpriced_nights
       FROM housing_status h JOIN users u ON u.id=h.user_id
       LEFT JOIN village_sleeping_options o ON o.id=h.sleeping_option_id
       WHERE h.status='IN_VILLAGE' AND h.date>=? AND h.date<?
       GROUP BY u.id
       ORDER BY cost DESC,nights DESC,u.name`
    )
    .all(range.start ?? "0000-01-01", range.end ?? "9999-12-31") as HousingReportRow[];
}

export type HousingNight = { date: string; village: string | null; sleeping_option: string | null; cost: number | null };
export type HousingNightsByWorker = Record<number, HousingNight[]>;

/** כל הלילות שנשמרו בכפר בטווח, לפי עובד/ת וממוינים לפי תאריך. */
export function getHousingNights(db: Database.Database, range: { start?: string; end?: string }): HousingNightsByWorker {
  const rows = db
    .prepare(
      `SELECT h.user_id,h.date,v.name village,o.name sleeping_option,o.cost_per_day cost
       FROM housing_status h
       LEFT JOIN village_sleeping_options o ON o.id=h.sleeping_option_id
       LEFT JOIN villages v ON v.id=o.village_id
       WHERE h.status='IN_VILLAGE' AND h.date>=? AND h.date<?
       ORDER BY h.date`
    )
    .all(range.start ?? "0000-01-01", range.end ?? "9999-12-31") as Array<HousingNight & { user_id: number }>;
  const byWorker: HousingNightsByWorker = {};
  for (const { user_id, ...night } of rows) (byWorker[user_id] ??= []).push(night);
  return byWorker;
}
