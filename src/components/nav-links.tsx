"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { HomeIcon, CalendarIcon, ClipboardListIcon, HistoryIcon, UsersIcon, SproutIcon, TruckIcon, BarChartIcon } from "./icons";

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }> };
export type Role = "ADMIN" | "PICKER";

const PICKER_NAV: NavItem[] = [
  { href: "/", label: "בית", icon: HomeIcon },
  { href: "/availability", label: "זמינות", icon: CalendarIcon },
  { href: "/assignments", label: "שיבוצים", icon: ClipboardListIcon },
  { href: "/history", label: "היסטוריה", icon: HistoryIcon },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/users", label: "עובדים", icon: UsersIcon },
  { href: "/admin/resources", label: "חקלאים", icon: SproutIcon },
  { href: "/admin/transport", label: "תחבורה", icon: TruckIcon },
  { href: "/admin/shifts", label: "משמרות", icon: ClipboardListIcon },
  { href: "/admin/reports", label: "דוחות", icon: BarChartIcon },
];

function itemsFor(role: Role): NavItem[] {
  return role === "ADMIN" ? ADMIN_NAV : PICKER_NAV;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);
  return (
    <nav className="sidebar-nav" aria-label="ניווט ראשי">
      {items.map(item => {
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={`sidebar-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <item.icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {items.map(item => {
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <item.icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
