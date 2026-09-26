"use client";
import { useState } from "react";
import { RangeTabs, RANGE_LABEL, type RangeKey } from "./range-tabs";
import { ExportExcelButton } from "./export-excel-button";
import { formatHebrewDate } from "@/lib/dates";

export type VehicleOption = { id: number; number: string; name: string; active: number };
export type VehicleTripRow = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  farm_name: string;
  field_name: string;
  fruit_type: string;
  leader: string;
  workers: number;
  hours: number;
};
export type TripsByVehicle = Record<number, VehicleTripRow[]>;
type DateRange = { start: string; end: string };

const formatHours = (hours: number) => hours.toLocaleString("he-IL", { maximumFractionDigits: 1 });

function summarize(trips: VehicleTripRow[]) {
  return {
    trips: trips.length,
    days: new Set(trips.map(t => t.date)).size,
    hours: trips.reduce((sum, t) => sum + t.hours, 0)
  };
}

const vehicleLabel = (vehicle: VehicleOption) => `${vehicle.name} (${vehicle.number})`;

export function VehicleTransportReport({
  vehicles,
  tripsByVehicle,
  ranges
}: {
  vehicles: VehicleOption[];
  tripsByVehicle: TripsByVehicle;
  ranges: Record<Exclude<RangeKey, "all">, DateRange>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>("all");

  const inRange = (trips: VehicleTripRow[]) => {
    if (range === "all") return trips;
    const { start, end } = ranges[range];
    return trips.filter(t => t.date >= start && t.date < end);
  };

  const selected = vehicles.find(v => v.id === selectedId) ?? null;
  const summaries = new Map(vehicles.map(v => [v.id, summarize(inRange(tripsByVehicle[v.id] ?? []))]));
  const ranked = [...vehicles].sort(
    (a, b) => summaries.get(b.id)!.trips - summaries.get(a.id)!.trips || b.active - a.active || a.name.localeCompare(b.name, "he")
  );
  const trips = selected ? inRange(tripsByVehicle[selected.id] ?? []) : [];
  const totals = selected ? summaries.get(selected.id)! : null;

  return (
    <div className="stack">
      <select
        className="input"
        aria-label="בחירת רכב"
        value={selectedId ?? ""}
        onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">כל הרכבים</option>
        {vehicles.map(v => (
          <option key={v.id} value={v.id}>{vehicleLabel(v)}{v.active ? "" : " · לא פעיל"}</option>
        ))}
      </select>

      <RangeTabs active={range} onChange={setRange} />

      {!selected && vehicles.length === 0 && (
        <section className="card empty-state">
          <p>לא נמצאו רכבים.</p>
        </section>
      )}

      {!selected && vehicles.length > 0 && (
        <>
          <ExportExcelButton
            fileName={`דוח תחבורה - ${RANGE_LABEL[range]}`}
            sheets={() => [{
              name: "רכבים",
              header: ["#", "רכב", "מספר רכב", "נסיעות", "ימי עבודה", "סך שעות משמרת", "סטטוס"],
              rows: ranked.map((v, i) => {
                const s = summaries.get(v.id)!;
                return [i + 1, v.name, v.number, s.trips, s.days, Math.round(s.hours * 100) / 100, v.active ? "פעיל" : "לא פעיל"];
              })
            }]}
          />
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th>#</th><th>רכב</th><th>נסיעות</th><th>ימי עבודה</th><th>סך שעות משמרת</th></tr>
              </thead>
              <tbody>
                {ranked.map((v, i) => {
                  const s = summaries.get(v.id)!;
                  return (
                    <tr key={v.id} className="table-row-clickable" onClick={() => setSelectedId(v.id)}>
                      <td>{i + 1}</td>
                      <td>
                        {v.name} <span dir="ltr" className="ltr-field muted">{v.number}</span>
                        {!v.active && <span className="muted"> (לא פעיל)</span>}
                      </td>
                      <td>{s.trips}</td>
                      <td>{s.days}</td>
                      <td>{formatHours(s.hours)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && totals && (
        <div className="kpi-grid">
          <article className="kpi-card">
            <span className="kpi-label">נסיעות · {RANGE_LABEL[range]}</span>
            <div className="metric">{totals.trips}</div>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">ימי עבודה</span>
            <div className="metric">{totals.days}</div>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">סך שעות משמרת</span>
            <div className="metric">{formatHours(totals.hours)}</div>
          </article>
        </div>
      )}

      {selected && trips.length > 0 && (
        <ExportExcelButton
          fileName={`דוח תחבורה - ${selected.name} - ${RANGE_LABEL[range]}`}
          sheets={() => [{
            name: "נסיעות",
            header: ["תאריך", "שעות", "חקלאי", "שדה", "גידול", "מוביל משמרת", "כמות עובדים", "משך (שעות)"],
            rows: trips.map(t => [
              { date: t.date }, `${t.start_time}–${t.end_time}`, t.farm_name, t.field_name, t.fruit_type, t.leader, t.workers,
              Math.round(t.hours * 100) / 100
            ])
          }]}
        />
      )}

      {selected && trips.length === 0 && (
        <section className="card empty-state">
          <p>לא נמצאו נסיעות עבור {vehicleLabel(selected)} בטווח זה.</p>
        </section>
      )}

      {selected && trips.length > 0 && (
        <div className="table-wrap card">
          <p className="muted">מציג {trips.length} נסיעות</p>
          <table className="table">
            <thead>
              <tr><th>תאריך</th><th>שעות</th><th>חקלאי · שדה</th><th>מוביל משמרת</th><th>כמות עובדים</th></tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>{formatHebrewDate(t.date)}</td>
                  <td><span dir="ltr" className="ltr-field">{t.start_time}–{t.end_time}</span></td>
                  <td>{t.farm_name} · {t.field_name} ({t.fruit_type})</td>
                  <td>{t.leader}</td>
                  <td>{t.workers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
