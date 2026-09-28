"use client";
import { useState } from "react";
import { HEBREW_MONTHS } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { AddVillageButton } from "./add-village-button";
import { EditVillageButton } from "./edit-village-button";
import { ActiveSwitch } from "./active-switch";
import { ShowArchivedToggle } from "./show-archived-toggle";
import { DeleteRecordButton } from "./delete-record-button";
import type { EditableVillage } from "./village-form";

export type VillageRow = EditableVillage & { active: number };

function monthsLabel(months: number[]) {
  if (months.length === 0) return "סגור להזמנות";
  if (months.length === 12) return "כל השנה";
  return months.map(m => HEBREW_MONTHS[m - 1]).join(", ");
}

function SleepingOptions({ village }: { village: VillageRow }) {
  if (village.sleepingOptions.length === 0) return <span className="muted">אין אפשרויות לינה</span>;
  return (
    <ul className="village-option-list">
      {village.sleepingOptions.map(option => (
        <li key={option.id}>
          <strong>{option.name}</strong> · {formatMoney(option.cost_per_day)} ליום
          {option.description && <div className="muted">{option.description}</div>}
        </li>
      ))}
    </ul>
  );
}

export function VillagesTable({ villages, csrf }: { villages: VillageRow[]; csrf: string }) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = showArchived ? villages : villages.filter(row => Boolean(row.active));
  const filtered = query
    ? visible.filter(row => row.name.toLowerCase().includes(query) || row.location.toLowerCase().includes(query))
    : visible;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם או מיקום" aria-label="חיפוש כפרים" />
        <ShowArchivedToggle checked={showArchived} onChange={setShowArchived} />
        <AddVillageButton csrf={csrf} />
      </div>

      {filtered.length === 0 && <p className="muted">לא נמצאו כפרים</p>}

      <div className="record-list mobile-only">
        {filtered.map(row => (
          <article className="record-card" key={row.id}>
            <div className="record-card-head">
              <div className="record-card-body">
                <span className="record-card-name">{row.name}</span>
                {row.location && <div className="record-card-meta">{row.location}</div>}
                <div className="record-card-meta">{monthsLabel(row.months)}</div>
                {row.description && <p className="muted">{row.description}</p>}
                <SleepingOptions village={row} />
              </div>
            </div>
            <div className="record-card-actions">
              <ActiveSwitch csrf={csrf} entity="VILLAGE" id={row.id} active={Boolean(row.active)} />
              <EditVillageButton csrf={csrf} village={row} />
              {!row.active && <DeleteRecordButton csrf={csrf} entity="VILLAGE" id={row.id} name={row.name} />}
            </div>
          </article>
        ))}
      </div>

      <div className="table-wrap desktop-only">
        <table className="table">
          <thead>
            <tr><th>שם</th><th>מיקום</th><th>חודשים פתוחים</th><th>אפשרויות לינה</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  {row.description && <div className="muted">{row.description}</div>}
                </td>
                <td>{row.location}</td>
                <td>{monthsLabel(row.months)}</td>
                <td><SleepingOptions village={row} /></td>
                <td><ActiveSwitch csrf={csrf} entity="VILLAGE" id={row.id} active={Boolean(row.active)} /></td>
                <td>
                  <div className="actions-cell">
                    <EditVillageButton csrf={csrf} village={row} />
                    {!row.active && <DeleteRecordButton csrf={csrf} entity="VILLAGE" id={row.id} name={row.name} />}
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
