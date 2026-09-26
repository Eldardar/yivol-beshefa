"use client";
import { useState } from "react";
import Image from "next/image";
import { FarmerPicker, type FarmerOption } from "./farmer-picker";
import { RangeTabs, RANGE_LABEL, type RangeKey } from "./range-tabs";
import { ExportExcelButton } from "./export-excel-button";
import { formatHebrewDate } from "@/lib/dates";
import { UNIT_LABEL, unitsPresent, type Unit } from "@/lib/units";
import type { XlsxSheet } from "@/lib/xlsx";

export type FarmerShiftRow = {
  id: number;
  date: string;
  plantation_field_id: number;
  field_name: string;
  fruit_type: string;
  leader: string;
  status: string;
  pickers: string[];
  units: Array<{ unit: Unit; goal: number; actual: number | null }>;
  actualHours: number | null;
};
export type ShiftsByFarmer = Record<number, FarmerShiftRow[]>;

function farmerShiftsSheet(shifts: FarmerShiftRow[]): XlsxSheet {
  const units = unitsPresent(shifts.map(row => row.units));
  return {
    name: "משמרות",
    header: ["תאריך", "שדה", "גידול", "מוביל משמרת", "כמות עובדים", "סך השעות בפועל", ...units.flatMap(u => [`יעד (${UNIT_LABEL[u]})`, `תוצאה (${UNIT_LABEL[u]})`])],
    rows: shifts.map(row => [
      { date: row.date }, row.field_name, row.fruit_type, row.leader, row.pickers.length,
      row.actualHours != null ? Math.round(row.actualHours * 100) / 100 : null,
      ...units.flatMap(u => {
        const entry = row.units.find(e => e.unit === u);
        return [entry?.goal, entry?.actual];
      })
    ])
  };
}

export function FarmerPerformanceReport({
  farmers,
  shiftsByFarmer,
  shiftCountsByRange
}: {
  farmers: FarmerOption[];
  shiftsByFarmer: ShiftsByFarmer;
  shiftCountsByRange: Record<RangeKey, Record<number, number>>;
}) {
  const [selected, setSelected] = useState<FarmerOption | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const shiftCounts = shiftCountsByRange[range];
  const shifts = selected ? shiftsByFarmer[selected.id] ?? [] : [];
  const rankedFarmers = [...farmers].sort((a, b) => (shiftCounts[b.id] ?? 0) - (shiftCounts[a.id] ?? 0) || a.name.localeCompare(b.name, "he"));

  return (
    <div className="stack">
      <FarmerPicker farmers={farmers} selected={selected} onSelect={setSelected} />

      {!selected && <RangeTabs active={range} onChange={setRange} />}

      {!selected && rankedFarmers.length > 0 && (
        <ExportExcelButton
          fileName={`נתוני קטיף לפי חקלאי - ${RANGE_LABEL[range]}`}
          sheets={() => [{
            name: "חקלאים",
            header: ["#", "חקלאי", `מספר משמרות (${RANGE_LABEL[range]})`, "סטטוס"],
            rows: rankedFarmers.map((farmer, i) => [i + 1, farmer.name, shiftCounts[farmer.id] ?? 0, farmer.active ? "פעיל" : "לא פעיל"])
          }]}
        />
      )}

      {selected && shifts.length > 0 && <ExportExcelButton fileName={`נתוני קטיף - ${selected.name}`} sheets={() => [farmerShiftsSheet(shifts)]} />}

      {!selected && rankedFarmers.length === 0 && (
        <section className="card empty-state" style={{ justifyItems: "center", textAlign: "center" }}>
          <Image
            src="/reports-placeholder.jpg"
            alt=""
            width={2316}
            height={3088}
            style={{ maxWidth: "100%", width: 240, height: "auto", borderRadius: "var(--radius-md)" }}
          />
          <p>בחר/י חקלאי כדי לראות את המשמרות שלו.</p>
        </section>
      )}

      {!selected && rankedFarmers.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>#</th><th>חקלאי</th><th>מספר משמרות</th><th></th></tr>
            </thead>
            <tbody>
              {rankedFarmers.map((farmer, i) => (
                <tr key={farmer.id} className="table-row-clickable" onClick={() => setSelected(farmer)}>
                  <td>{i + 1}</td>
                  <td>{farmer.name}</td>
                  <td>{shiftCounts[farmer.id] ?? 0}</td>
                  <td>{farmer.active ? "" : "(לא פעיל)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && shifts.length === 0 && (
        <section className="card empty-state">
          <p>לא נמצאו משמרות עבור {selected.name}.</p>
        </section>
      )}

      {selected && shifts.length > 0 && (
        <div className="table-wrap card">
          <p className="muted">מציג {shifts.length} משמרות</p>
          <table className="table">
            <thead>
              <tr><th>תאריך</th><th>שדה וגידול</th><th>כמות עובדים</th><th>סך השעות בפועל</th><th>יעד / תוצאה</th></tr>
            </thead>
            <tbody>
              {shifts.map(row => (
                <tr key={row.id}>
                  <td>{formatHebrewDate(row.date)}</td>
                  <td>{row.field_name} · {row.fruit_type}</td>
                  <td>{row.pickers.length}</td>
                  <td>{row.actualHours != null ? `${row.actualHours.toLocaleString("he-IL", { maximumFractionDigits: 1 })} שעות` : <span className="muted">טרם דווח</span>}</td>
                  <td>
                    {row.units.length === 0
                      ? <span className="muted">לא הוגדר יעד</span>
                      : row.units.map((u, i) => (
                        <span key={u.unit} className="unit-line">
                          <span dir="ltr" className="ltr-field">{u.actual ?? "—"}/{u.goal}</span> {UNIT_LABEL[u.unit]}
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
