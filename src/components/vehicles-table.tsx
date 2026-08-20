"use client";
import { useState } from "react";
import { AddVehicleButton } from "./add-vehicle-button";
import { EditVehicleButton } from "./edit-vehicle-button";
import { ActiveSwitch } from "./active-switch";
import { ShowArchivedToggle } from "./show-archived-toggle";

export type VehicleRow = { id: number; number: string; name: string; notes: string; active: number };

export function VehiclesTable({ vehicles, csrf }: { vehicles: VehicleRow[]; csrf: string }) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = showArchived ? vehicles : vehicles.filter(row => Boolean(row.active));
  const filtered = query
    ? visible.filter(row => row.number.toLowerCase().includes(query) || row.name.toLowerCase().includes(query))
    : visible;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי מספר או שם" aria-label="חיפוש רכבים" />
        <ShowArchivedToggle checked={showArchived} onChange={setShowArchived} />
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
              </div>
            </div>
            <div className="record-card-actions">
              <ActiveSwitch csrf={csrf} entity="VEHICLE" id={row.id} active={Boolean(row.active)} />
              <EditVehicleButton csrf={csrf} vehicle={row} />
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
                <td><ActiveSwitch csrf={csrf} entity="VEHICLE" id={row.id} active={Boolean(row.active)} /></td>
                <td>
                  <div className="actions-cell">
                    <EditVehicleButton csrf={csrf} vehicle={row} />
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
