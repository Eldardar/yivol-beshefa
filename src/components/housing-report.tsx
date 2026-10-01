"use client";
import { Fragment, useState } from "react";
import { ExportExcelButton } from "./export-excel-button";
import { ChevronDownIcon } from "./icons";
import { formatMoney } from "@/lib/format";
import { formatHebrewDate } from "@/lib/dates";
import type { HousingNight, HousingNightsByWorker, HousingReportRow } from "@/lib/housing-report";

function WorkerNights({ nights }: { nights: HousingNight[] }) {
  return (
    <div className="sub-tables">
      <table className="table">
        <thead>
          <tr><th>תאריך</th><th>מיקום</th><th>אפשרות לינה</th><th>עלות</th></tr>
        </thead>
        <tbody>
          {nights.map(night => (
            <tr key={night.date}>
              <td>{formatHebrewDate(night.date)}</td>
              <td>{night.village ?? <span className="muted">—</span>}</td>
              <td>{night.sleeping_option ?? <span className="muted">לא נבחרה</span>}</td>
              <td>{night.cost === null ? <span className="muted">—</span> : formatMoney(night.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HousingReport({ rows, nightsByWorker, label, fileLabel }: { rows: HousingReportRow[]; nightsByWorker: HousingNightsByWorker; label: string; fileLabel: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const totalNights = rows.reduce((sum, r) => sum + r.nights, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const unpricedNights = rows.reduce((sum, r) => sum + r.unpriced_nights, 0);

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
          <span className="kpi-label">עובדים שישנו בכפר</span>
          <div className="metric">{rows.length}</div>
        </article>
      </div>

      {rows.length === 0 ? (
        <section className="card empty-state">
          <p>לא נמצאו לילות בכפר בטווח זה.</p>
        </section>
      ) : (
        <>
          <ExportExcelButton
            fileName={`דוח מגורים - ${fileLabel}`}
            sheets={() => [{
              name: "מגורים",
              header: ["#", "עובד/ת", "לילות", "עלות כוללת", "לילות ללא אפשרות לינה"],
              rows: rows.map((r, i) => [i + 1, r.name, r.nights, { money: r.cost }, r.unpriced_nights]),
              footer: [null, "סה\"כ", totalNights, { money: totalCost }, unpricedNights]
            }, {
              name: "פירוט לילות",
              header: ["עובד/ת", "תאריך", "מיקום", "אפשרות לינה", "עלות"],
              rows: rows.flatMap(r => (nightsByWorker[r.user_id] ?? []).map(n => [
                r.name, { date: n.date }, n.village, n.sleeping_option, n.cost === null ? null : { money: n.cost }
              ]))
            }]}
          />
          {unpricedNights > 0 && (
            <p className="muted">{unpricedNights} לילות נרשמו ללא אפשרות לינה ולכן אינם כלולים בעלות.</p>
          )}
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th aria-hidden="true"></th><th>#</th><th>עובד/ת</th><th>לילות</th><th>עלות כוללת</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isOpen = expanded === r.user_id;
                  const toggle = () => setExpanded(isOpen ? null : r.user_id);
                  return (
                    <Fragment key={r.user_id}>
                      <tr className="table-row-clickable" onClick={toggle}>
                        <td>
                          <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? `סגירת הלילות של ${r.name}` : `פתיחת הלילות של ${r.name}`} onClick={e => { e.stopPropagation(); toggle(); }}>
                            <ChevronDownIcon size={28} />
                          </button>
                        </td>
                        <td>{i + 1}</td>
                        <td>
                          {r.name}
                          {!r.active && <span className="muted"> (לא פעיל)</span>}
                        </td>
                        <td>
                          {r.nights}
                          {r.unpriced_nights > 0 && <span className="muted"> ({r.unpriced_nights} ללא אפשרות לינה)</span>}
                        </td>
                        <td>{formatMoney(r.cost)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="worker-expand-row">
                          <td colSpan={5}><WorkerNights nights={nightsByWorker[r.user_id] ?? []} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td></td><td></td><td>סה&quot;כ</td><td>{totalNights}</td><td>{formatMoney(totalCost)}</td></tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
