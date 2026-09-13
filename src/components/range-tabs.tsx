import Link from "next/link";

const TABS = [
  { key: "month", label: "החודש" },
  { key: "year", label: "השנה" },
  { key: "all", label: "כל הזמנים" }
] as const;

export type RangeKey = (typeof TABS)[number]["key"];
export const RANGE_KEYS: RangeKey[] = TABS.map(tab => tab.key);

export function RangeTabs({ active, basePath }: { active: RangeKey; basePath: string }) {
  return (
    <div className="tabs" role="tablist">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`${basePath}${basePath.includes("?") ? "&" : "?"}range=${tab.key}`}
          role="tab"
          aria-selected={tab.key === active}
          className={`tab${tab.key === active ? " is-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
