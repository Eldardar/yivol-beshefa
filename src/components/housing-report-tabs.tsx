import Link from "next/link";

const TABS = [
  { key: "all", href: "/admin/reports/housing?view=all", label: "כל הזמנים" },
  { key: "monthly", href: "/admin/reports/housing?view=monthly", label: "חודשי" },
  { key: "weekly", href: "/admin/reports/housing?view=weekly", label: "שבועי" }
] as const;

export type HousingReportTabKey = (typeof TABS)[number]["key"];
export const HOUSING_REPORT_VIEWS: HousingReportTabKey[] = TABS.map(tab => tab.key);

export function HousingReportTabs({ active }: { active: HousingReportTabKey }) {
  return (
    <div className="tabs" role="tablist">
      {TABS.map(tab => (
        <Link key={tab.key} href={tab.href} role="tab" aria-selected={tab.key === active} className={`tab${tab.key === active ? " is-active" : ""}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
