import Link from "next/link";

const TABS = [
  { key: "daily", href: "/admin/reports?period=daily", label: "יומי" },
  { key: "weekly", href: "/admin/reports?period=weekly", label: "שבועי" },
  { key: "monthly", href: "/admin/reports?period=monthly", label: "חודשי" },
  { key: "employee", href: "/admin/reports/employee-performance", label: "ביצועי עובדים" }
] as const;

export type ReportsTabKey = (typeof TABS)[number]["key"];

export function ReportsTabs({ active }: { active: ReportsTabKey }) {
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
