"use client";

const TABS = [
  { key: "all", label: "כל הזמנים" },
  { key: "year", label: "השנה" },
  { key: "month", label: "החודש" }
] as const;

export type RangeKey = (typeof TABS)[number]["key"];
export const RANGE_KEYS: RangeKey[] = TABS.map(tab => tab.key);
export const RANGE_LABEL = Object.fromEntries(TABS.map(tab => [tab.key, tab.label])) as Record<RangeKey, string>;

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
