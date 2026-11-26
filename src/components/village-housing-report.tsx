"use client";
import { Fragment, useState } from "react";
import { ExportExcelButton } from "./export-excel-button";
import { ChevronDownIcon } from "./icons";
import { formatMoney } from "@/lib/format";
import { formatHebrewDate } from "@/lib/dates";
import { villageKey, type HousingNightsByVillage, type VillageHousingNight, type VillageHousingReportRow } from "@/lib/housing-report";

const NO_VILLAGE = "ללא כפר";
const villageName = (r: VillageHousingReportRow) => r.name ?? NO_VILLAGE;

function VillageNights({ nights }: { nights: VillageHousingNight[] }) {
  return (
    <div className="sub-tables">
      <table className="table">
        <thead>
          <tr><th>תאריך</th><th>עובד/ת</th><th>אפשרות לינה</th><th>עלות</th></tr>
        </thead>
        <tbody>
          {nights.map((night, i) => (
            <tr key={`${night.date}-${i}`}>
              <td>{formatHebrewDate(night.date)}</td>
              <td>{night.worker}</td>
              <td>{night.sleeping_option ?? <span className="muted">לא נבחרה</span>}</td>
              <td>{night.cost === null ? <span className="muted">—</span> : formatMoney(night.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VillageHousingReport({ rows, nightsByVillage, label, fileLabel }: { rows: VillageHousingReportRow[]; nightsByVillage: HousingNightsByVillage; label: string; fileLabel: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const totalNights = rows.reduce((sum, r) => sum + r.nights, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const unpricedNights = rows.reduce((sum, r) => sum + r.unpriced_nights, 0);
  const villageCount = rows.filter(r => r.village_id !== null).length;

  return (
    <div className="stack">
      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">סה&quot;כ עלות מגורים · {label}</span>
          <div className="metric">{formatMoney(totalCost)}</div>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">סה&quot;כ לילות</span>
          <div className="metric">{totalNights}</div>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">כפרים עם לינה</span>
          <div className="metric">{villageCount}</div>
        </article>
      </div>

      {rows.length === 0 ? (
        <section className="card empty-state">
          <p>לא נמצאו לילות בכפר בטווח זה.</p>
        </section>
      ) : (
        <>
          <ExportExcelButton
            fileName={`דוח מגורים כפרים - ${fileLabel}`}
            sheets={() => [{
              name: "כפרים",
              header: ["#", "כפר", "לילות", "עובדים", "עלות כוללת", "לילות ללא אפשרות לינה"],
              rows: rows.map((r, i) => [i + 1, villageName(r), r.nights, r.workers, { money: r.cost }, r.unpriced_nights]),
              footer: [null, "סה\"כ", totalNights, null, { money: totalCost }, unpricedNights]
            }, {
              name: "פירוט לילות",
              header: ["כפר", "תאריך", "עובד/ת", "אפשרות לינה", "עלות"],
              rows: rows.flatMap(r => (nightsByVillage[villageKey(r.village_id)] ?? []).map(n => [
                villageName(r), { date: n.date }, n.worker, n.sleeping_option, n.cost === null ? null : { money: n.cost }
              ]))
            }]}
          />
          {unpricedNights > 0 && (
            <p className="muted">{unpricedNights} לילות נרשמו ללא אפשרות לינה ולכן אינם כלולים בעלות.</p>
          )}
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th aria-hidden="true"></th><th>#</th><th>כפר</th><th>לילות</th><th>עובדים</th><th>עלות כוללת</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const key = villageKey(r.village_id);
                  const name = villageName(r);
                  const isOpen = expanded === key;
                  const toggle = () => setExpanded(isOpen ? null : key);
                  return (
                    <Fragment key={key}>
                      <tr className="table-row-clickable" onClick={toggle}>
                        <td>
                          <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? `סגירת הלילות ב${name}` : `פתיחת הלילות ב${name}`} onClick={e => { e.stopPropagation(); toggle(); }}>
                            <ChevronDownIcon size={28} />
                          </button>
                        </td>
                        <td>{i + 1}</td>
                        <td>
                          {r.village_id === null ? <span className="muted">{NO_VILLAGE}</span> : name}
                          {r.active === 0 && <span className="muted"> (בארכיון)</span>}
                        </td>
                        <td>
                          {r.nights}
                          {r.unpriced_nights > 0 && <span className="muted"> ({r.unpriced_nights} ללא אפשרות לינה)</span>}
                        </td>
                        <td>{r.workers}</td>
                        <td>{formatMoney(r.cost)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="worker-expand-row">
                          <td colSpan={6}><VillageNights nights={nightsByVillage[key] ?? []} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td></td><td></td><td>סה&quot;כ</td><td>{totalNights}</td><td></td><td>{formatMoney(totalCost)}</td></tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
