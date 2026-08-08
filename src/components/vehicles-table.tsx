"use client";
import { useState } from "react";
import { AddVehicleButton } from "./add-vehicle-button";
import { TrashIcon } from "./icons";

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

      {filtered.length === 0 && <p className="muted">לא נמצאו רכבים</p>}

      <div className="record-list mobile-only">
        {filtered.map(row => (
          <article className="record-card" key={row.id}>
            <div className="record-card-head">
              <div className="record-card-body">
                <span className="record-card-name" dir="ltr">{row.number}</span>
                <div className="record-card-meta">{row.name}</div>
                <span className={`tag ${row.active ? "" : "bad"}`}>{row.active ? "פעיל" : "בארכיון"}</span>
              </div>
            </div>
            <div className="record-card-actions">
              <ActiveForm csrf={csrf} id={row.id} active={!row.active} />
            </div>
          </article>
        ))}
      </div>

      <div className="table-wrap desktop-only">
        <table className="table">
          <thead>
            <tr><th>מספר</th><th>שם</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
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
        <button className="btn btn-sm secondary">שחזור</button>
      ) : (
        <button className="icon-btn danger" title="העברה לארכיון" aria-label="העברה לארכיון"><TrashIcon size={18} /></button>
      )}
    </form>
  );
}
