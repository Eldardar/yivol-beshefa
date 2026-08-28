"use client";
import { useState } from "react";
import { UNITS, UNIT_LABEL, type Unit } from "@/lib/units";
import { XIcon, PlusIcon } from "./icons";

type Line = { key: number; value: number | string; unit: Unit };
let nextKey = 0;
const makeLine = (value: number | string = "", unit: Unit = "KG"): Line => ({ key: nextKey++, value, unit });

export function UnitLines({ valueName, unitName, initial, addLabel, valueLabel, unitLabel }: { valueName: string; unitName: string; initial: Array<{ value: number; unit: Unit }>; addLabel: string; valueLabel?: string; unitLabel?: string }) {
  const [lines, setLines] = useState<Line[]>(() => (initial.length ? initial.map((l) => makeLine(l.value, l.unit)) : [makeLine()]));

  return (
    <div className="stack">
      {lines.map((line, i) => (
        <div className="line-row" key={line.key}>
          <input className="input" name={valueName} aria-label={valueLabel} type="number" min="0" step="0.01" required value={line.value}
            onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, value: e.target.value } : l)))} />
          <select className="input" name={unitName} aria-label={unitLabel} value={line.unit}
            onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, unit: e.target.value as Unit } : l)))}>
            {UNITS.map((u) => <option value={u} key={u}>{UNIT_LABEL[u]}</option>)}
          </select>
          {lines.length > 1 && (
            <button type="button" className="icon-btn" aria-label="הסרת שורה" onClick={() => setLines(lines.filter((_, j) => j !== i))}><XIcon size={18} /></button>
          )}
          {i === lines.length - 1 && (
            <button type="button" className="icon-btn-circle" aria-label={addLabel} onClick={() => setLines([...lines, makeLine()])}><PlusIcon size={18} /></button>
          )}
        </div>
      ))}
    </div>
  );
}
