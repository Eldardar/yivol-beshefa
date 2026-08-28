"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { HomeIcon, CalendarIcon, ClipboardListIcon, HistoryIcon, UsersIcon, SproutIcon, TruckIcon, BarChartIcon, ChevronDownIcon } from "./icons";

export type NavChild = { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }> };
export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; children?: NavChild[] };
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
  {
    href: "/admin/shifts",
    label: "משמרות",
    icon: ClipboardListIcon,
    children: [
      { href: "/admin/shifts", label: "ניהול משמרות", icon: ClipboardListIcon },
      { href: "/admin/shifts/availability", label: "זמינות עובדים", icon: CalendarIcon },
    ],
  },
  { href: "/admin/reports", label: "דוחות", icon: BarChartIcon },
];

function itemsFor(role: Role): NavItem[] {
  return role === "ADMIN" ? ADMIN_NAV : PICKER_NAV;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isChildActive(pathname: string, href: string) {
  return pathname === href;
}

function groupActive(pathname: string, item: NavItem) {
  return item.children ? item.children.some(child => isChildActive(pathname, child.href)) : isActive(pathname, item.href);
}

export function SidebarNavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = itemsFor(role);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.filter(item => item.children?.some(child => isChildActive(pathname, child.href))).map(item => item.href))
  );
  const toggle = (href: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  return (
    <nav className="sidebar-nav" aria-label="ניווט ראשי">
      {items.map(item => {
        const active = groupActive(pathname, item);
        if (item.children) {
          const isOpen = open.has(item.href);
          return (
            <div key={item.href} className="sidebar-nav-group">
              <button
                type="button"
                className={`sidebar-nav-link sidebar-nav-group-trigger${active ? " is-active" : ""}`}
                aria-expanded={isOpen}
                onClick={() => toggle(item.href)}
              >
                <item.icon size={22} />
                <span>{item.label}</span>
                <ChevronDownIcon size={16} className={`sidebar-nav-chevron${isOpen ? " is-open" : ""}`} />
              </button>
              {isOpen && (
                <div className="sidebar-nav-subgroup">
                  {item.children.map(child => {
                    const childActive = isChildActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar-nav-sublink${childActive ? " is-active" : ""}`}
                        aria-current={childActive ? "page" : undefined}
                      >
                        <child.icon size={18} />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
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
  const [openHref, setOpenHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openHref) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenHref(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openHref]);
  return (
    <nav ref={navRef} className="bottom-nav" aria-label="ניווט ראשי">
      {items.map(item => {
        const active = groupActive(pathname, item);
        if (item.children) {
          const isOpen = openHref === item.href;
          return (
            <div key={item.href} className="bottom-nav-group">
              <button
                type="button"
                className={`bottom-nav-link${active ? " is-active" : ""}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setOpenHref(isOpen ? null : item.href)}
              >
                <item.icon size={22} />
                <span>{item.label}</span>
              </button>
              {isOpen && (
                <div className="bottom-nav-popover" role="menu">
                  {item.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="bottom-nav-popover-link"
                      role="menuitem"
                      onClick={() => setOpenHref(null)}
                    >
                      <child.icon size={18} />
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }
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
