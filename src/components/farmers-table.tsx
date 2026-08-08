"use client";
import { Fragment, useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { AddFarmerButton } from "./add-farmer-button";
import { AddSeasonButton } from "./add-season-button";
import { ChevronDownIcon, TrashIcon } from "./icons";

export type FarmRow = { id: number; name: string; contact_person: string; phone: string; address: string; active: number };
export type SeasonRow = { id: number; farm_id: number; crop: string; start_date: string; end_date: string; active: number };
export type SeasonsByFarm = Record<number, SeasonRow[]>;

type SeasonStatus = "over" | "ongoing" | "future";
const STATUS_TAG: Record<SeasonStatus, string> = { over: "bad", ongoing: "", future: "warn" };
const STATUS_LABEL: Record<SeasonStatus, string> = { over: "הסתיימה", ongoing: "פעילה כעת", future: "עתידית" };

function seasonStatus(season: SeasonRow, today: string): SeasonStatus {
  if (season.end_date < today) return "over";
  if (season.start_date > today) return "future";
  return "ongoing";
}

export function FarmersTable({ farms, seasonsByFarm, csrf, today }: { farms: FarmRow[]; seasonsByFarm: SeasonsByFarm; csrf: string; today: string }) {
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
          const seasons = seasonsByFarm[row.id] ?? [];
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
                  <span className={`tag ${row.active ? "" : "bad"}`}>{row.active ? "פעיל" : "בארכיון"}</span>
                </div>
                <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי חקלאי" : "פתיחת פרטי חקלאי"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                  <ChevronDownIcon size={20} />
                </button>
              </div>
              <div className="record-card-actions">
                <AddSeasonButton csrf={csrf} farmId={row.id} farmName={row.name} />
                <ActiveForm csrf={csrf} id={row.id} active={!row.active} />
              </div>
              {isOpen && (
                <div className="record-card-details">
                  <div className="sub-tables">
                    <SeasonsList seasons={seasons} today={today} csrf={csrf} />
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
              const seasons = seasonsByFarm[row.id] ?? [];
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
                    <td><span className={`tag ${row.active ? "" : "bad"}`}>{row.active ? "פעיל" : "בארכיון"}</span></td>
                    <td>
                      <div className="actions-cell">
                        <AddSeasonButton csrf={csrf} farmId={row.id} farmName={row.name} />
                        <ActiveForm csrf={csrf} id={row.id} active={!row.active} />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="worker-expand-row">
                      <td colSpan={7}>
                        <div className="sub-tables">
                          <SeasonsList seasons={seasons} today={today} csrf={csrf} />
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

function SeasonsList({ seasons, today, csrf }: { seasons: SeasonRow[]; today: string; csrf: string }) {
  return (
    <div className="stack">
      <h3>עונות גידול</h3>
      {seasons.length === 0 ? <p className="muted">אין עונות רשומות</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>גידול</th><th>טווח</th><th>מצב</th><th>פעולה</th></tr></thead>
            <tbody>
              {seasons.map(s => {
                const status = seasonStatus(s, today);
                return (
                  <tr key={s.id}>
                    <td>{s.crop}</td>
                    <td>{formatHebrewDate(s.start_date)}–{formatHebrewDate(s.end_date)}</td>
                    <td><span className={`tag ${STATUS_TAG[status]}`}>{STATUS_LABEL[status]}</span></td>
                    <td><SeasonActiveForm csrf={csrf} id={s.id} active={!s.active} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActiveForm({ csrf, id, active }: { csrf: string; id: number; active: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value="FARM" />
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

function SeasonActiveForm({ csrf, id, active }: { csrf: string; id: number; active: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value="SEASON" />
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
