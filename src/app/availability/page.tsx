import Link from "next/link";
import { AppShell } from "@/components/nav";
import { requireUser } from "@/lib/server";
import { WorkAvailabilityTab } from "./work-tab";
import { HousingAvailabilityTab } from "./housing-tab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "work", label: "עבודה", href: "/availability" },
  { key: "housing", label: "מגורים", href: "/availability?tab=housing" },
] as const;

export default async function Availability({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string; error?: string; y?: string; m?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const query = await searchParams;
  const active = query.tab === "housing" ? "housing" : "work";

  return (
    <AppShell user={user}>
      <h1>זמינות</h1>
      <div className="tabs" role="tablist" aria-label="סוג זמינות">
        {TABS.map(tab => (
          <Link key={tab.key} href={tab.href} role="tab" aria-selected={tab.key === active} className={`tab${tab.key === active ? " is-active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </div>
      {active === "housing"
        ? <HousingAvailabilityTab userId={user.id} y={query.y} m={query.m} />
        : <WorkAvailabilityTab userId={user.id} saved={query.saved} error={query.error} />}
    </AppShell>
  );
}
