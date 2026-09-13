"use client";

const TABS = [
  { key: "month", label: "החודש" },
  { key: "year", label: "השנה" },
  { key: "all", label: "כל הזמנים" }
] as const;

export type RangeKey = (typeof TABS)[number]["key"];
export const RANGE_KEYS: RangeKey[] = TABS.map(tab => tab.key);

export function RangeTabs({ active, onChange }: { active: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="tabs" role="tablist">
      {TABS.map(tab => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={`tab${tab.key === active ? " is-active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
