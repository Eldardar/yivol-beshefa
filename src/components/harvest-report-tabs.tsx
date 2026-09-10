import Link from "next/link";

const TABS = [
  { key: "farmer", href: "/admin/reports/harvest?view=farmer", label: "חקלאי" },
  { key: "crop", href: "/admin/reports/harvest?view=crop", label: "סוג פרי" },
  { key: "season", href: "/admin/reports/harvest?view=season", label: "עונה" }
] as const;

export type HarvestReportTabKey = (typeof TABS)[number]["key"];

export function HarvestReportTabs({ active }: { active: HarvestReportTabKey }) {
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
