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

  return { pickers, farms, plantationFieldsByFarm, shifts, unitsByShift, ratedUnitsByField, unitRatesByField, pickerNamesByShift, pickerIdsByShift, pickerHoursByShift, vehiclesByShift, vehicleIdsByShift };
}

export function getRecentShiftsByWorker(database: Database.Database, today: string, limit = 7): ShiftsByWorker {
  const rows = database
    .prepare(
      `SELECT user_id,id,date,start_time,end_time,actual_start,actual_end,plantation_field_id,farm,fruit_type,leader,status FROM (
         SELECT sp.user_id user_id, s.id id, s.date date, s.start_time start_time, s.end_time end_time,
                sh.start_time actual_start, sh.end_time actual_end,
                s.plantation_field_id plantation_field_id, f.name farm, pf.fruit_type fruit_type, u.name leader, s.status status,
                ROW_NUMBER() OVER (PARTITION BY sp.user_id ORDER BY s.date DESC, s.start_time DESC) rn
         FROM shift_pickers sp
         JOIN shifts s ON s.id = sp.shift_id
         JOIN plantation_fields pf ON pf.id = s.plantation_field_id
         JOIN farms f ON f.id = pf.farm_id
         JOIN users u ON u.id = s.leader_id
         LEFT JOIN shift_hours sh ON sh.shift_id = s.id AND sh.user_id = sp.user_id
         WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED')
       ) ranked WHERE rn <= ?
       ORDER BY user_id, date DESC, start_time DESC`
    )
    .all(today, limit) as Array<EmployeeShiftRow & { user_id: number }>;

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

export function getRecentShiftsByFarmer(database: Database.Database, today: string, limit = 7): ShiftsByFarmer {
  const rows = database
    .prepare(
      `SELECT farm_id,id,date,start_time,end_time,plantation_field_id,field_name,fruit_type,leader,status FROM (
         SELECT pf.farm_id farm_id, s.id id, s.date date, s.start_time start_time, s.end_time end_time,
                s.plantation_field_id plantation_field_id, pf.name field_name, pf.fruit_type fruit_type, u.name leader, s.status status,
                ROW_NUMBER() OVER (PARTITION BY pf.farm_id ORDER BY s.date DESC, s.start_time DESC) rn
         FROM shifts s
         JOIN plantation_fields pf ON pf.id = s.plantation_field_id
         JOIN users u ON u.id = s.leader_id
         WHERE s.status IN ('PUBLISHED','COMPLETED') AND (s.date < ? OR s.status = 'COMPLETED')
       ) ranked WHERE rn <= ?
       ORDER BY farm_id, date DESC, start_time DESC`
    )
    .all(today, limit) as Array<FarmerShiftRow & { farm_id: number }>;

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
  const actualHoursByShift = new Map<number, number>();
  for (const h of hoursRows) {
    actualHoursByShift.set(h.shift_id, (actualHoursByShift.get(h.shift_id) ?? 0) + hoursBetween(h.start_time, h.end_time));
  }

  const shiftsByFarmer: ShiftsByFarmer = {};
  for (const { farm_id, ...row } of rows) {
    (shiftsByFarmer[farm_id] ??= []).push({ ...row, pickers: pickersByShift.get(row.id) ?? [], units: goalsByShift.get(row.id) ?? [], actualHours: actualHoursByShift.get(row.id) ?? null });
  }
  return shiftsByFarmer;
}
