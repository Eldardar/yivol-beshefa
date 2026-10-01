import type Database from "better-sqlite3";
import type { BookableVillage } from "@/components/housing-calendar";

type OptionRow = { village_id: number; village_name: string; location: string; description: string; option_id: number; option_name: string; option_description: string; cost_per_day: number };

// כפרים פעילים ואפשרויות הלינה שלהם שפתוחים להזמנה בחודש הנתון
export function bookableVillages(database: Database.Database, month: number): BookableVillage[] {
  const rows = database.prepare(`SELECT v.id village_id,v.name village_name,v.location,v.description,o.id option_id,o.name option_name,o.description option_description,o.cost_per_day
    FROM villages v JOIN village_available_months m ON m.village_id=v.id AND m.month=? JOIN village_sleeping_options o ON o.village_id=v.id
    WHERE v.active=1 ORDER BY v.name,v.id,o.cost_per_day,o.id`).all(month) as OptionRow[];
  const villages: BookableVillage[] = [];
  for (const row of rows) {
    let village = villages.find(v => v.id === row.village_id);
    if (!village) villages.push(village = { id: row.village_id, name: row.village_name, location: row.location, description: row.description, options: [] });
    village.options.push({ id: row.option_id, name: row.option_name, description: row.option_description, costPerDay: row.cost_per_day });
  }
  return villages;
}
