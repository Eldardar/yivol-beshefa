import type { ReactNode } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { UNIT_LABEL } from "@/lib/units";
import { formatMoney } from "@/lib/format";
import type { FruitRecord, FruitTopResults } from "@/lib/shifts-data";

export type WorkerRef = { id: number; name: string; active?: number | boolean };

// A fruit type's best single-shift results.
export function FruitTopResultsCard({
  fruitType,
  results,
  workersById,
  rangeLabel,
  showEarnings = false,
  onSelectWorker,
  controls
}: {
  fruitType: string;
  results: FruitRecord[];
  workersById: Map<number, WorkerRef>;
  rangeLabel: string;
  showEarnings?: boolean;
  onSelectWorker?: (workerId: number) => void;
  controls?: ReactNode;
}) {
  return (
    <section className="card best-workers">
      <h2>🏆 {fruitType}</h2>
      {controls}
      <p className="muted">5 התוצאות הטובות ביותר במשמרת אחת ({rangeLabel})</p>
      {results.length === 0 ? (
        <p className="muted">אין עדיין תוצאות.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>#</th><th>עובד/ת</th><th>תוצאה</th>{showEarnings && <th>שווי</th>}</tr>
          </thead>
          <tbody>
            {results.map((result, i) => {
              const worker = workersById.get(result.userId);
              const clickable = Boolean(worker && onSelectWorker);
              return (
                <tr
                  key={`${result.userId}:${result.date}:${i}`}
                  className={`${clickable ? "table-row-clickable" : ""}${worker?.active !== undefined && !worker.active ? " row-inactive" : ""}`}
                  title={formatHebrewDate(result.date)}
                  onClick={clickable ? () => onSelectWorker!(result.userId) : undefined}
                >
                  <td>{i + 1}</td>
                  <td>{worker?.name ?? "—"}</td>
                  <td>
                    {result.quantities.map(q => (
                      <span key={q.unit} className="unit-line">
                        <span dir="ltr" className="ltr-field">{q.quantity}</span> {UNIT_LABEL[q.unit]}
                      </span>
                    ))}
                  </td>
                  {showEarnings && <td>{formatMoney(result.earnings)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

// One card per fruit type.
export function FruitTopResultsCards({
  fruitTopResults,
  ...rest
}: { fruitTopResults: FruitTopResults[] } & Omit<Parameters<typeof FruitTopResultsCard>[0], "fruitType" | "results" | "controls">) {
  return fruitTopResults.map(({ fruitType, results }) => (
    <FruitTopResultsCard key={fruitType} fruitType={fruitType} results={results} {...rest} />
  ));
}
