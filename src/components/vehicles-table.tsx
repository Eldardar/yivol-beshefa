"use client";
import { useState } from "react";
import { AddVehicleButton } from "./add-vehicle-button";

export type VehicleRow = { id: number; number: string; name: string; active: number };

export function VehiclesTable({ vehicles, csrf }: { vehicles: VehicleRow[]; csrf: string }) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? vehicles.filter(row => row.number.toLowerCase().includes(query) || row.name.toLowerCase().includes(query))
    : vehicles;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי מספר או שם" aria-label="חיפוש רכבים" />
        <AddVehicleButton csrf={csrf} />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>מספר</th><th>שם</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={4}>לא נמצאו רכבים</td></tr>}
            {filtered.map(row => (
              <tr key={row.id}>
                <td><span dir="ltr" className="ltr-field">{row.number}</span></td>
                <td>{row.name}</td>
                <td><span className={`tag ${row.active ? "" : "bad"}`}>{row.active ? "פעיל" : "בארכיון"}</span></td>
                <td>
                  <div className="actions-cell">
                    <ActiveForm csrf={csrf} id={row.id} active={!row.active} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveForm({ csrf, id, active }: { csrf: string; id: number; active: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value="VEHICLE" />
      <input type="hidden" name="entityId" value={id} />
      <input type="hidden" name="active" value={active ? "1" : "0"} />
      {active ? (
        <button className="btn">שחזור</button>
      ) : (
        <button className="icon-btn" title="העברה לארכיון" aria-label="העברה לארכיון"><TrashIcon /></button>
      )}
    </form>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
