import type Database from "better-sqlite3";

export type WorkerShiftRow = {
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
  plantation_field_id: number;
};

export type WorkerHousingRow = { date: string; status: "IN_VILLAGE" | "MAYBE"; village: string | null; option: string | null };

/** Published (and completed) shifts in [from, to) the worker is assigned to as a picker or leads. */
export function workerShiftsBetween(db: Database.Database, userId: number, from: string, to: string): WorkerShiftRow[] {
  return db
    .prepare(
      `SELECT s.id,s.date,s.start_time,s.end_time,s.notes,u.name leader,f.name farm,f.address,f.navigation_link,pf.fruit_type,pf.fruit_subtype,s.plantation_field_id
       FROM shifts s JOIN users u ON u.id=s.leader_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND s.date>=? AND s.date<?
         AND (s.leader_id=? OR EXISTS(SELECT 1 FROM shift_pickers sp WHERE sp.shift_id=s.id AND sp.user_id=?))
       ORDER BY s.date,s.start_time`
    )
    .all(from, to, userId, userId) as WorkerShiftRow[];
}

/** Days in [from, to) the worker marked as sleeping (or maybe sleeping) in a village, with the booked option if any. */
export function workerVillageNightsBetween(db: Database.Database, userId: number, from: string, to: string): WorkerHousingRow[] {
  return db
    .prepare(
      `SELECT h.date,h.status,v.name village,o.name option
       FROM housing_status h LEFT JOIN village_sleeping_options o ON o.id=h.sleeping_option_id LEFT JOIN villages v ON v.id=o.village_id
       WHERE h.user_id=? AND h.status IN ('IN_VILLAGE','MAYBE') AND h.date>=? AND h.date<?
       ORDER BY h.date`
    )
    .all(userId, from, to) as WorkerHousingRow[];
}
