import "server-only";
import type Database from "better-sqlite3";
import type { Picker, FarmOption, PlantationFieldOption, PlantationFieldsByFarm } from "@/components/shift-form";
import type {
  ShiftRow,
  UnitsByShift,
  PickerNamesByShift,
  PickerIdsByShift,
  PickerHoursByShift,
  VehiclesByShift,
  VehicleIdsByShift,
  RatedUnitsByField,
  UnitRatesByField,
  PersonalGoalUnitsByShift,
} from "@/components/shifts-table";
import type { Unit } from "@/lib/units";
import type { EmployeeShiftRow, ShiftsByWorker } from "@/components/employee-performance-report";
import type { FarmerShiftRow, ShiftsByFarmer } from "@/components/farmer-performance-report";

export type ShiftsPageData = {
  pickers: Picker[];
  farms: FarmOption[];
  plantationFieldsByFarm: PlantationFieldsByFarm;
  shifts: ShiftRow[];
  unitsByShift: UnitsByShift;
  ratedUnitsByField: RatedUnitsByField;
  unitRatesByField: UnitRatesByField;
  pickerNamesByShift: PickerNamesByShift;
  pickerIdsByShift: PickerIdsByShift;
  pickerHoursByShift: PickerHoursByShift;
  vehiclesByShift: VehiclesByShift;
  vehicleIdsByShift: VehicleIdsByShift;
  personalGoalUnitsByShift: PersonalGoalUnitsByShift;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function hoursBetween(startTime: string, endTime: string): number {
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

const SHIFT_SELECT = `SELECT s.id,s.date,s.start_time,s.end_time,s.status,s.notes,pf.farm_id,s.plantation_field_id,s.leader_id,u.name leader,f.name farm,pf.fruit_type,s.team_leader_details,(SELECT COUNT(*) FROM shift_pickers WHERE shift_id=s.id) picker_count
   FROM shifts s JOIN users u ON u.id=s.leader_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id`;

export function loadShiftsPageData(database: Database.Database, opts: { dateFrom?: string; dateTo?: string; limit?: number } = {}): ShiftsPageData {
  const { dateFrom, dateTo, limit = 100 } = opts;

  const pickers = database.prepare("SELECT id,name FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as Picker[];
  const farms = database.prepare("SELECT DISTINCT f.id,f.name FROM farms f JOIN plantation_fields pf ON pf.farm_id=f.id WHERE f.active=1 AND pf.active=1 ORDER BY f.name").all() as FarmOption[];
  const plantationFieldRows = database.prepare("SELECT pf.id,pf.farm_id farmId,pf.name,pf.fruit_type fruitType,pf.fruit_subtype fruitSubtype FROM plantation_fields pf JOIN farms f ON f.id=pf.farm_id WHERE pf.active=1 AND f.active=1 ORDER BY pf.id DESC").all() as Array<PlantationFieldOption & { farmId: number }>;
  const plantationFieldsByFarm: PlantationFieldsByFarm = {};
  for (const { farmId, ...field } of plantationFieldRows) (plantationFieldsByFarm[farmId] ??= []).push(field);

  const shifts = dateFrom && dateTo
    ? (database.prepare(`${SHIFT_SELECT} WHERE s.date>=? AND s.date<? ORDER BY s.date DESC,s.start_time DESC`).all(dateFrom, dateTo) as ShiftRow[])
    : (database.prepare(`${SHIFT_SELECT} ORDER BY s.date DESC,s.start_time DESC LIMIT ?`).all(limit) as ShiftRow[]);

  const goalRows = database.prepare("SELECT shift_id,unit,goal,actual FROM shift_goals").all() as Array<{ shift_id: number; unit: Unit; goal: number; actual: number | null }>;
  const unitsByShift: UnitsByShift = {};
  for (const g of goalRows) (unitsByShift[g.shift_id] ??= []).push({ unit: g.unit, goal: g.goal, produced: g.actual });

  const goalUnitRows = database.prepare("SELECT shift_id,unit FROM shift_goal_units").all() as Array<{ shift_id: number; unit: Unit }>;
  const personalGoalUnitsByShift: PersonalGoalUnitsByShift = {};
  for (const g of goalUnitRows) (personalGoalUnitsByShift[g.shift_id] ??= []).push(g.unit);

  const pickerRows = database
    .prepare(
      `SELECT sp.shift_id,u.id user_id,u.name,sh.start_time,sh.end_time
       FROM shift_pickers sp JOIN users u ON u.id=sp.user_id
       LEFT JOIN shift_hours sh ON sh.shift_id=sp.shift_id AND sh.user_id=sp.user_id
       ORDER BY u.name`
    )
    .all() as Array<{ shift_id: number; user_id: number; name: string; start_time: string | null; end_time: string | null }>;
  const quantityRows = database.prepare("SELECT shift_id,user_id,unit,quantity FROM quantities").all() as Array<{ shift_id: number; user_id: number; unit: Unit; quantity: number }>;
  const quantitiesByShiftUser = new Map<string, Array<{ unit: Unit; quantity: number }>>();
  for (const q of quantityRows) {
    const key = `${q.shift_id}_${q.user_id}`;
    (quantitiesByShiftUser.get(key) ?? quantitiesByShiftUser.set(key, []).get(key)!).push({ unit: q.unit, quantity: q.quantity });
  }
  const pickerNamesByShift: PickerNamesByShift = {};
  const pickerIdsByShift: PickerIdsByShift = {};
  const pickerHoursByShift: PickerHoursByShift = {};
  for (const p of pickerRows) {
    (pickerNamesByShift[p.shift_id] ??= []).push(p.name);
    (pickerIdsByShift[p.shift_id] ??= []).push(p.user_id);
    (pickerHoursByShift[p.shift_id] ??= []).push({ name: p.name, startTime: p.start_time, endTime: p.end_time, quantities: quantitiesByShiftUser.get(`${p.shift_id}_${p.user_id}`) ?? [] });
  }

  const rateRows = database.prepare("SELECT field_id,unit,rate_nis FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number }>;
  const ratedUnitsByField: RatedUnitsByField = {};
  const unitRatesByField: UnitRatesByField = {};
  for (const r of rateRows) {
    (ratedUnitsByField[r.field_id] ??= []).push(r.unit);
    (unitRatesByField[r.field_id] ??= {})[r.unit] = r.rate_nis;
  }

  const vehicleRows = database
    .prepare("SELECT sv.shift_id,v.id vehicle_id,v.number,v.name FROM shift_vehicles sv JOIN vehicles v ON v.id=sv.vehicle_id ORDER BY v.number")
    .all() as Array<{ shift_id: number; vehicle_id: number; number: string; name: string }>;
  const vehiclesByShift: VehiclesByShift = {};
  const vehicleIdsByShift: VehicleIdsByShift = {};
  for (const v of vehicleRows) {
    (vehiclesByShift[v.shift_id] ??= []).push({ number: v.number, name: v.name });
    (vehicleIdsByShift[v.shift_id] ??= []).push(v.vehicle_id);
  }

  return { pickers, farms, plantationFieldsByFarm, shifts, unitsByShift, ratedUnitsByField, unitRatesByField, pickerNamesByShift, pickerIdsByShift, pickerHoursByShift, vehiclesByShift, vehicleIdsByShift, personalGoalUnitsByShift };
}

export function getShiftsByWorker(database: Database.Database, today: string): ShiftsByWorker {
  const rows = database
    .prepare(
      `SELECT sp.user_id user_id, s.id id, s.date date, s.start_time start_time, s.end_time end_time,
              sh.start_time actual_start, sh.end_time actual_end,
              s.plantation_field_id plantation_field_id, f.name farm, pf.fruit_type fruit_type, u.name leader, s.status status
       FROM shift_pickers sp
       JOIN shifts s ON s.id = sp.shift_id
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       JOIN farms f ON f.id = pf.farm_id
       JOIN users u ON u.id = s.leader_id
       LEFT JOIN shift_hours sh ON sh.shift_id = s.id AND sh.user_id = sp.user_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED')
       ORDER BY sp.user_id, s.date DESC, s.start_time DESC`
    )
    .all(today) as Array<EmployeeShiftRow & { user_id: number }>;

  const quantityRows = database.prepare("SELECT shift_id,user_id,unit,quantity FROM quantities").all() as Array<{ shift_id: number; user_id: number; unit: Unit; quantity: number }>;
  const quantitiesByShiftUser = new Map<string, Array<{ unit: Unit; quantity: number }>>();
  for (const q of quantityRows) {
    const key = `${q.shift_id}_${q.user_id}`;
    (quantitiesByShiftUser.get(key) ?? quantitiesByShiftUser.set(key, []).get(key)!).push({ unit: q.unit, quantity: q.quantity });
  }

  const shiftsByWorker: ShiftsByWorker = {};
  for (const { user_id, ...row } of rows) {
    (shiftsByWorker[user_id] ??= []).push({ ...row, quantities: quantitiesByShiftUser.get(`${row.id}_${user_id}`) ?? [] });
  }
  return shiftsByWorker;
}

export function getShiftCountsByWorker(database: Database.Database, today: string, range?: { start: string; end: string }): Record<number, number> {
  const rangeClause = range ? "AND s.date >= ? AND s.date < ?" : "";
  const params = range ? [today, range.start, range.end] : [today];
  const rows = database
    .prepare(
      `SELECT sp.user_id user_id, COUNT(*) count
       FROM shift_pickers sp
       JOIN shifts s ON s.id = sp.shift_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED') ${rangeClause}
       GROUP BY sp.user_id`
    )
    .all(...params) as Array<{ user_id: number; count: number }>;
  const counts: Record<number, number> = {};
  for (const r of rows) counts[r.user_id] = r.count;
  return counts;
}

export function getTotalHoursByWorker(database: Database.Database, today: string): Record<number, number> {
  const rows = database
    .prepare(
      `SELECT sp.user_id user_id, sh.start_time start_time, sh.end_time end_time
       FROM shift_pickers sp
       JOIN shifts s ON s.id = sp.shift_id
       JOIN shift_hours sh ON sh.shift_id = s.id AND sh.user_id = sp.user_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED')`
    )
    .all(today) as Array<{ user_id: number; start_time: string; end_time: string }>;
  const hours: Record<number, number> = {};
  for (const r of rows) hours[r.user_id] = (hours[r.user_id] ?? 0) + hoursBetween(r.start_time, r.end_time);
  return hours;
}

export function getShiftCountsByFarmer(database: Database.Database, today: string, range?: { start: string; end: string }): Record<number, number> {
  const rangeClause = range ? "AND s.date >= ? AND s.date < ?" : "";
  const params = range ? [today, range.start, range.end] : [today];
  const rows = database
    .prepare(
      `SELECT pf.farm_id farm_id, COUNT(*) count
       FROM shifts s
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED') ${rangeClause}
       GROUP BY pf.farm_id`
    )
    .all(...params) as Array<{ farm_id: number; count: number }>;
  const counts: Record<number, number> = {};
  for (const r of rows) counts[r.farm_id] = r.count;
  return counts;
}

export function getPickedAmountsByFruitType(database: Database.Database, today: string, range?: { start: string; end: string }): Record<string, Array<{ unit: Unit; quantity: number }>> {
  const rangeClause = range ? "AND s.date >= ? AND s.date < ?" : "";
  const params = range ? [today, range.start, range.end] : [today];
  const rows = database
    .prepare(
      `SELECT pf.fruit_type fruit_type, g.unit unit, SUM(g.actual) total
       FROM shift_goals g
       JOIN shifts s ON s.id = g.shift_id
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       WHERE g.actual IS NOT NULL AND s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED') ${rangeClause}
       GROUP BY pf.fruit_type, g.unit`
    )
    .all(...params) as Array<{ fruit_type: string; unit: Unit; total: number }>;
  const amounts: Record<string, Array<{ unit: Unit; quantity: number }>> = {};
  for (const r of rows) (amounts[r.fruit_type] ??= []).push({ unit: r.unit, quantity: r.total });
  return amounts;
}

export type FruitTypeFarmerRow = { farmId: number; farmName: string; shiftCount: number; amounts: Array<{ unit: Unit; quantity: number }> };

export function getFarmerBreakdownByFruitType(database: Database.Database, today: string, range?: { start: string; end: string }): Record<string, FruitTypeFarmerRow[]> {
  const rangeClause = range ? "AND s.date >= ? AND s.date < ?" : "";
  const params = range ? [today, range.start, range.end] : [today];
  const where = `WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED') ${rangeClause}`;
  const shiftRows = database
    .prepare(
      `SELECT pf.fruit_type fruit_type, f.id farm_id, f.name farm_name, COUNT(*) count
       FROM shifts s
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       JOIN farms f ON f.id = pf.farm_id
       ${where}
       GROUP BY pf.fruit_type, f.id
       ORDER BY f.name`
    )
    .all(...params) as Array<{ fruit_type: string; farm_id: number; farm_name: string; count: number }>;
  const amountRows = database
    .prepare(
      `SELECT pf.fruit_type fruit_type, pf.farm_id farm_id, g.unit unit, SUM(g.actual) total
       FROM shift_goals g
       JOIN shifts s ON s.id = g.shift_id
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       ${where} AND g.actual IS NOT NULL
       GROUP BY pf.fruit_type, pf.farm_id, g.unit`
    )
    .all(...params) as Array<{ fruit_type: string; farm_id: number; unit: Unit; total: number }>;
  const breakdown: Record<string, FruitTypeFarmerRow[]> = {};
  const byKey = new Map<string, FruitTypeFarmerRow>();
  for (const r of shiftRows) {
    const row: FruitTypeFarmerRow = { farmId: r.farm_id, farmName: r.farm_name, shiftCount: r.count, amounts: [] };
    (breakdown[r.fruit_type] ??= []).push(row);
    byKey.set(`${r.fruit_type}|${r.farm_id}`, row);
  }
  for (const r of amountRows) byKey.get(`${r.fruit_type}|${r.farm_id}`)?.amounts.push({ unit: r.unit, quantity: r.total });
  return breakdown;
}

export function getShiftsByFarmer(database: Database.Database, today: string): ShiftsByFarmer {
  const rows = database
    .prepare(
      `SELECT pf.farm_id farm_id, s.id id, s.date date, s.start_time start_time, s.end_time end_time,
              s.plantation_field_id plantation_field_id, pf.name field_name, pf.fruit_type fruit_type, u.name leader, s.status status
       FROM shifts s
       JOIN plantation_fields pf ON pf.id = s.plantation_field_id
       JOIN users u ON u.id = s.leader_id
       WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED')
       ORDER BY pf.farm_id, s.date DESC, s.start_time DESC`
    )
    .all(today) as Array<FarmerShiftRow & { farm_id: number }>;

  const goalRows = database.prepare("SELECT shift_id,unit,goal,actual FROM shift_goals").all() as Array<{ shift_id: number; unit: Unit; goal: number; actual: number | null }>;
  const goalsByShift = new Map<number, Array<{ unit: Unit; goal: number; actual: number | null }>>();
  for (const g of goalRows) {
    (goalsByShift.get(g.shift_id) ?? goalsByShift.set(g.shift_id, []).get(g.shift_id)!).push({ unit: g.unit, goal: g.goal, actual: g.actual });
  }

  const pickerRows = database.prepare("SELECT sp.shift_id,u.name FROM shift_pickers sp JOIN users u ON u.id=sp.user_id ORDER BY u.name").all() as Array<{ shift_id: number; name: string }>;
  const pickersByShift = new Map<number, string[]>();
  for (const p of pickerRows) {
    (pickersByShift.get(p.shift_id) ?? pickersByShift.set(p.shift_id, []).get(p.shift_id)!).push(p.name);
  }

  const hoursRows = database.prepare("SELECT shift_id,start_time,end_time FROM shift_hours").all() as Array<{ shift_id: number; start_time: string; end_time: string }>;
  const hoursTotalsByShift = new Map<number, { sum: number; count: number }>();
  for (const h of hoursRows) {
    const totals = hoursTotalsByShift.get(h.shift_id) ?? { sum: 0, count: 0 };
    totals.sum += hoursBetween(h.start_time, h.end_time);
    totals.count += 1;
    hoursTotalsByShift.set(h.shift_id, totals);
  }
  const actualHoursByShift = new Map<number, number>();
  for (const [shiftId, { sum, count }] of hoursTotalsByShift) {
    actualHoursByShift.set(shiftId, sum / count);
  }

  const shiftsByFarmer: ShiftsByFarmer = {};
  for (const { farm_id, ...row } of rows) {
    (shiftsByFarmer[farm_id] ??= []).push({ ...row, pickers: pickersByShift.get(row.id) ?? [], units: goalsByShift.get(row.id) ?? [], actualHours: actualHoursByShift.get(row.id) ?? null });
  }
  return shiftsByFarmer;
}
