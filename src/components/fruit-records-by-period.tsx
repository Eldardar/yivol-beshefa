"use client";
import { useState } from "react";
import { FruitTopResultsCard, type WorkerRef } from "./fruit-top-results";
import type { FruitTopResults } from "@/lib/shifts-data";

type Period = "month" | "year";
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "month", label: "החודש" },
  { key: "year", label: "השנה" }
];

// Per-fruit records cards, each with its own monthly/annual toggle.
export function FruitRecordsByPeriod({
  byPeriod,
  workers
}: {
  byPeriod: Record<Period, FruitTopResults[]>;
  workers: WorkerRef[];
}) {
  const workersById = new Map(workers.map(worker => [worker.id, worker]));
  // This year's fruit types cover this month's.
  const fruitTypes = byPeriod.year.map(fruit => fruit.fruitType);
  if (fruitTypes.length === 0) return null;
  return (
    <div className="fruit-records">
      {fruitTypes.map(fruitType => (
        <FruitCard key={fruitType} fruitType={fruitType} byPeriod={byPeriod} workersById={workersById} />
      ))}
    </div>
  );
}

function FruitCard({
  fruitType,
  byPeriod,
  workersById
}: {
  fruitType: string;
  byPeriod: Record<Period, FruitTopResults[]>;
  workersById: Map<number, WorkerRef>;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const results = byPeriod[period].find(fruit => fruit.fruitType === fruitType)?.results ?? [];
  return (
    <FruitTopResultsCard
      fruitType={fruitType}
      results={results}
      workersById={workersById}
      rangeLabel={PERIODS.find(p => p.key === period)!.label}
      controls={
        <div className="tabs" role="tablist" aria-label={`טווח זמן · ${fruitType}`}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={p.key === period}
              className={`tab${p.key === period ? " is-active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    />
  );
}
