import { AppShell } from "@/components/nav";
import { ShiftsTable, type ShiftRow, type UnitsByShift, type PickerNamesByShift, type PickerIdsByShift, type PickerHoursByShift, type VehiclesByShift, type VehicleIdsByShift, type RatedUnitsByField } from "@/components/shifts-table";
import type { Picker, FarmOption, PlantationFieldOption, PlantationFieldsByFarm } from "@/components/shift-form";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Shifts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;
  const database = db();

  const pickers = database.prepare("SELECT id,name FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as Picker[];
  const farms = database.prepare("SELECT DISTINCT f.id,f.name FROM farms f JOIN plantation_fields pf ON pf.farm_id=f.id WHERE f.active=1 AND pf.active=1 ORDER BY f.name").all() as FarmOption[];
  const plantationFieldRows = database.prepare("SELECT pf.id,pf.farm_id farmId,pf.name,pf.fruit_type fruitType,pf.fruit_subtype fruitSubtype FROM plantation_fields pf JOIN farms f ON f.id=pf.farm_id WHERE pf.active=1 AND f.active=1 ORDER BY pf.id DESC").all() as Array<PlantationFieldOption & { farmId: number }>;
  const plantationFieldsByFarm: PlantationFieldsByFarm = {};
  for (const { farmId, ...field } of plantationFieldRows) (plantationFieldsByFarm[farmId] ??= []).push(field);
  const shifts = database
    .prepare(
      `SELECT s.id,s.date,s.start_time,s.end_time,s.status,s.notes,pf.farm_id,s.plantation_field_id,s.leader_id,u.name leader,f.name farm,pf.fruit_type,s.team_leader_details,(SELECT COUNT(*) FROM shift_pickers WHERE shift_id=s.id) picker_count
       FROM shifts s JOIN users u ON u.id=s.leader_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       ORDER BY s.date DESC,s.start_time DESC LIMIT 100`
    )
    .all() as ShiftRow[];

  const goalRows = database.prepare("SELECT shift_id,unit,goal FROM shift_goals").all() as Array<{ shift_id: number; unit: Unit; goal: number }>;
  const producedRows = database.prepare("SELECT shift_id,unit,SUM(quantity) produced FROM quantities GROUP BY shift_id,unit").all() as Array<{ shift_id: number; unit: Unit; produced: number }>;
  const unitsByShift: UnitsByShift = {};
  for (const g of goalRows) (unitsByShift[g.shift_id] ??= []).push({ unit: g.unit, goal: g.goal, produced: 0 });
  for (const p of producedRows) {
    const list = unitsByShift[p.shift_id] ??= [];
    const existing = list.find(x => x.unit === p.unit);
    if (existing) existing.produced = p.produced; else list.push({ unit: p.unit, goal: 0, produced: p.produced });
  }

  const pickerRows = database
    .prepare(
      `SELECT sp.shift_id,u.id user_id,u.name,sh.start_time,sh.end_time
       FROM shift_pickers sp JOIN users u ON u.id=sp.user_id
       LEFT JOIN shift_hours sh ON sh.shift_id=sp.shift_id AND sh.user_id=sp.user_id
       ORDER BY u.name`
    )
    .all() as Array<{ shift_id: number; user_id: number; name: string; start_time: string | null; end_time: string | null }>;
  const pickerNamesByShift: PickerNamesByShift = {};
  const pickerIdsByShift: PickerIdsByShift = {};
  const pickerHoursByShift: PickerHoursByShift = {};
  for (const p of pickerRows) {
    (pickerNamesByShift[p.shift_id] ??= []).push(p.name);
    (pickerIdsByShift[p.shift_id] ??= []).push(p.user_id);
    (pickerHoursByShift[p.shift_id] ??= []).push({ name: p.name, startTime: p.start_time, endTime: p.end_time });
  }

  const rateRows = database.prepare("SELECT field_id,unit FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit }>;
  const ratedUnitsByField: RatedUnitsByField = {};
  for (const r of rateRows) (ratedUnitsByField[r.field_id] ??= []).push(r.unit);

  const vehicleRows = database
    .prepare("SELECT sv.shift_id,v.id vehicle_id,v.number,v.name FROM shift_vehicles sv JOIN vehicles v ON v.id=sv.vehicle_id ORDER BY v.number")
    .all() as Array<{ shift_id: number; vehicle_id: number; number: string; name: string }>;
  const vehiclesByShift: VehiclesByShift = {};
  const vehicleIdsByShift: VehicleIdsByShift = {};
  for (const v of vehicleRows) {
    (vehiclesByShift[v.shift_id] ??= []).push({ number: v.number, name: v.name });
    (vehicleIdsByShift[v.shift_id] ??= []).push(v.vehicle_id);
  }

  return (
    <AppShell user={user}>
      <h1>ניהול משמרות</h1>
      {query.saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {query.warning && <p className="alert" role="alert">אזהרה: {query.warning}</p>}
      {query.error && <p className="alert" role="alert">{query.error}</p>}
      <section className="card">
        <ShiftsTable
          shifts={shifts}
          pickers={pickers}
          farms={farms}
          plantationFieldsByFarm={plantationFieldsByFarm}
          unitsByShift={unitsByShift}
          ratedUnitsByField={ratedUnitsByField}
          pickerNamesByShift={pickerNamesByShift}
          pickerIdsByShift={pickerIdsByShift}
          pickerHoursByShift={pickerHoursByShift}
          vehiclesByShift={vehiclesByShift}
          vehicleIdsByShift={vehicleIdsByShift}
          csrf={csrf}
        />
      </section>
    </AppShell>
  );
}
