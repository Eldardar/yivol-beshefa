"use client";
import { Fragment, useState } from "react";
import { AddFarmerButton } from "./add-farmer-button";
import { EditFarmerButton } from "./edit-farmer-button";
import { AddPlantationFieldButton } from "./add-plantation-field-button";
import { EditPlantationFieldButton } from "./edit-plantation-field-button";
import { ActiveSwitch } from "./active-switch";
import { ChevronDownIcon } from "./icons";

export type FarmRow = { id: number; name: string; contact_person: string; phone: string; address: string; navigation_link: string | null; notes: string; active: number };
export type PlantationFieldRow = { id: number; farm_id: number; name: string; fruit_type: string; fruit_subtype: string; size: number | null; location: string; details: string; active: number };
export type PlantationFieldsByFarm = Record<number, PlantationFieldRow[]>;

export function FarmersTable({ farms, plantationFieldsByFarm, csrf }: { farms: FarmRow[]; plantationFieldsByFarm: PlantationFieldsByFarm; csrf: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? farms.filter(row => row.name.toLowerCase().includes(query) || row.contact_person.toLowerCase().includes(query) || row.phone.toLowerCase().includes(query) || row.address.toLowerCase().includes(query))
    : farms;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם, איש קשר, טלפון או כתובת" aria-label="חיפוש חקלאים" />
        <AddFarmerButton csrf={csrf} />
      </div>

      {filtered.length === 0 && <p className="muted">לא נמצאו חקלאים</p>}

      {/* Mobile: scannable cards */}
      <div className="record-list mobile-only">
        {filtered.map(row => {
          const isOpen = expanded === row.id;
          const fields = plantationFieldsByFarm[row.id] ?? [];
          return (
            <article className="record-card" key={row.id}>
              <div className="record-card-head">
                <div className="record-card-body">
                  <span className="record-card-name">{row.name}</span>
                  <div className="record-card-meta">
                    <span>{row.contact_person}</span>
                    <span>·</span>
                    <span dir="ltr" className="ltr-field">{row.phone}</span>
                  </div>
                </div>
                <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי חקלאי" : "פתיחת פרטי חקלאי"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                  <ChevronDownIcon size={20} />
                </button>
              </div>
              <div className="record-card-actions">
                <ActiveSwitch csrf={csrf} entity="FARM" id={row.id} active={Boolean(row.active)} />
                <EditFarmerButton csrf={csrf} farm={row} />
              </div>
              {isOpen && (
                <div className="record-card-details">
                  <div className="sub-tables">
                    <PlantationFieldsList fields={fields} farmId={row.id} farmName={row.name} csrf={csrf} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Desktop: data table */}
      <div className="table-wrap desktop-only">
        <table className="table">
          <thead>
            <tr><th aria-hidden="true"></th><th>שם</th><th>איש קשר</th><th>טלפון</th><th>כתובת</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const isOpen = expanded === row.id;
              const fields = plantationFieldsByFarm[row.id] ?? [];
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי חקלאי" : "פתיחת פרטי חקלאי"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                        <ChevronDownIcon size={18} />
                      </button>
                    </td>
                    <td>{row.name}</td>
                    <td>{row.contact_person}</td>
                    <td><span dir="ltr" className="ltr-field">{row.phone}</span></td>
                    <td>{row.address}</td>
                    <td><ActiveSwitch csrf={csrf} entity="FARM" id={row.id} active={Boolean(row.active)} /></td>
                    <td>
                      <div className="actions-cell">
                        <EditFarmerButton csrf={csrf} farm={row} />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="worker-expand-row">
                      <td colSpan={7}>
                        <div className="sub-tables">
                          <PlantationFieldsList fields={fields} farmId={row.id} farmName={row.name} csrf={csrf} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlantationFieldsList({ fields, farmId, farmName, csrf }: { fields: PlantationFieldRow[]; farmId: number; farmName: string; csrf: string }) {
  return (
    <div className="stack">
      <div className="table-toolbar">
        <h3>חלקות גידול</h3>
        <AddPlantationFieldButton csrf={csrf} farmId={farmId} farmName={farmName} />
      </div>
      {fields.length === 0 ? <p className="muted">אין חלקות רשומות</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>שם</th><th>סוג פרי</th><th>תת-סוג</th><th>גודל</th><th>מיקום</th><th>מצב</th><th>פעולה</th></tr></thead>
            <tbody>
              {fields.map(f => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.fruit_type}</td>
                  <td>{f.fruit_subtype}</td>
                  <td>{f.size ?? "—"}</td>
                  <td>{f.location || "—"}</td>
                  <td><ActiveSwitch csrf={csrf} entity="PLANTATION_FIELD" id={f.id} active={Boolean(f.active)} /></td>
                  <td>
                    <div className="actions-cell">
                      <EditPlantationFieldButton csrf={csrf} farmId={farmId} field={f} />
                    </div>
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
