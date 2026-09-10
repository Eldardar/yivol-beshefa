"use client";
import { useState } from "react";
import Image from "next/image";
import { FarmerPicker, type FarmerOption } from "./farmer-picker";
import { formatHebrewDate } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";

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

export function FarmerPerformanceReport({
  farmers,
  shiftsByFarmer
}: {
  farmers: FarmerOption[];
  shiftsByFarmer: ShiftsByFarmer;
}) {
  const [selected, setSelected] = useState<FarmerOption | null>(null);
  const shifts = selected ? shiftsByFarmer[selected.id] ?? [] : [];

  return (
    <div className="stack">
      <FarmerPicker farmers={farmers} selected={selected} onSelect={setSelected} />

      {!selected && (
        <section className="card empty-state" style={{ justifyItems: "center", textAlign: "center" }}>
          <Image
            src="/reports-placeholder.jpg"
            alt=""
            width={2316}
            height={3088}
            style={{ maxWidth: "100%", width: 240, height: "auto", borderRadius: "var(--radius-md)" }}
          />
          <p>בחר/י חקלאי כדי לראות את 7 המשמרות האחרונות שלו.</p>
        </section>
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
                        <span key={u.unit}>
                          {i > 0 && " · "}
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
