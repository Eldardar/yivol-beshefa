import { AppShell } from "@/components/nav";
import { ShiftsTable, type ShiftRow, type UnitsByShift, type PickerNamesByShift, type PickerIdsByShift, type VehiclesByShift, type VehicleIdsByShift } from "@/components/shifts-table";
import type { Picker, SeasonOption } from "@/components/shift-form";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Shifts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;
  const database = db();

  const pickers = database.prepare("SELECT id,name FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as Picker[];
  const seasons = database.prepare("SELECT se.id,se.crop,f.name farm FROM seasons se JOIN farms f ON f.id=se.farm_id WHERE se.active=1 AND f.active=1 ORDER BY se.start_date DESC").all() as SeasonOption[];
  const shifts = database
    .prepare(
      `SELECT s.id,s.date,s.slot,s.status,s.notes,s.season_id,s.leader_id,u.name leader,f.name farm,se.crop,(SELECT COUNT(*) FROM shift_pickers WHERE shift_id=s.id) picker_count
       FROM shifts s JOIN users u ON u.id=s.leader_id JOIN seasons se ON se.id=s.season_id JOIN farms f ON f.id=se.farm_id
       ORDER BY s.date DESC,s.slot LIMIT 100`
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
    .prepare("SELECT sp.shift_id,u.id user_id,u.name FROM shift_pickers sp JOIN users u ON u.id=sp.user_id ORDER BY u.name")
    .all() as Array<{ shift_id: number; user_id: number; name: string }>;
  const pickerNamesByShift: PickerNamesByShift = {};
  const pickerIdsByShift: PickerIdsByShift = {};
  for (const p of pickerRows) {
    (pickerNamesByShift[p.shift_id] ??= []).push(p.name);
    (pickerIdsByShift[p.shift_id] ??= []).push(p.user_id);
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
          seasons={seasons}
          unitsByShift={unitsByShift}
          pickerNamesByShift={pickerNamesByShift}
          pickerIdsByShift={pickerIdsByShift}
          vehiclesByShift={vehiclesByShift}
          vehicleIdsByShift={vehicleIdsByShift}
          csrf={csrf}
        />
      </section>
    </AppShell>
  );
}
