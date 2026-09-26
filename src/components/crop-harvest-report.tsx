"use client";
import { useState } from "react";
import { FruitTypePicker } from "./fruit-type-picker";
import { RangeTabs, type RangeKey } from "./range-tabs";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import type { FruitTypeFarmerRow } from "@/lib/shifts-data";

export type PickedAmounts = Record<string, Array<{ unit: Unit; quantity: number }>>;

function formatAmounts(entries: Array<{ unit: Unit; quantity: number }> | undefined) {
  if (!entries || entries.length === 0) return <span className="muted">לא נקטף בטווח זה</span>;
  return entries.map((e, i) => (
    <span key={e.unit}>
      {i > 0 && " · "}
      <span dir="ltr" className="ltr-field">{e.quantity.toLocaleString("he-IL")}</span> {UNIT_LABEL[e.unit]}
    </span>
  ));
}

export function CropHarvestReport({
  fruitTypes,
  pickedAmountsByRange,
  farmerBreakdownByRange
}: {
  fruitTypes: string[];
  pickedAmountsByRange: Record<RangeKey, PickedAmounts>;
  farmerBreakdownByRange: Record<RangeKey, Record<string, FruitTypeFarmerRow[]>>;
}) {
  const [selectedFruitType, setSelectedFruitType] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");

  const amounts = pickedAmountsByRange[range];
  const farmerRows = selectedFruitType ? (farmerBreakdownByRange[range][selectedFruitType] ?? []) : [];

  return (
    <div className="stack">
      <FruitTypePicker fruitTypes={fruitTypes} selected={selectedFruitType} onSelect={setSelectedFruitType} />

      <RangeTabs active={range} onChange={setRange} />

      {!selectedFruitType && fruitTypes.length === 0 && (
        <section className="card empty-state">
          <p>לא נמצאו סוגי פרי.</p>
        </section>
      )}

      {!selectedFruitType && fruitTypes.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>#</th><th>סוג פרי</th><th>כמות שנקטפה</th></tr>
            </thead>
            <tbody>
              {fruitTypes.map((fruitType, i) => (
                <tr key={fruitType} className="table-row-clickable" onClick={() => setSelectedFruitType(fruitType)}>
                  <td>{i + 1}</td>
                  <td>{fruitType}</td>
                  <td>{formatAmounts(amounts[fruitType])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFruitType && (
        <div className="kpi-grid">
          <article className="kpi-card">
            <span className="kpi-label">כמות שנקטפה · {selectedFruitType}</span>
            <div className="metric">{formatAmounts(amounts[selectedFruitType])}</div>
          </article>
        </div>
      )}

      {selectedFruitType && farmerRows.length === 0 && (
        <section className="card empty-state">
          <p>אין משמרות לסוג פרי זה בטווח זה.</p>
        </section>
      )}

      {selectedFruitType && farmerRows.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>#</th><th>חקלאי</th><th>כמות שנקטפה</th><th>משמרות</th></tr>
            </thead>
            <tbody>
              {farmerRows.map((row, i) => (
                <tr key={row.farmId}>
                  <td>{i + 1}</td>
                  <td>{row.farmName}</td>
                  <td>{formatAmounts(row.amounts)}</td>
                  <td>{row.shiftCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
