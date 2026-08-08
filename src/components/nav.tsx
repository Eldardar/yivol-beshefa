import Link from "next/link";
import type { SessionUser } from "@/lib/services/auth";
import { csrfValue } from "@/lib/server";
import { BrandLockup } from "./brand-logo";
import { SidebarNavLinks, BottomNavLinks } from "./nav-links";
import { BellIcon, UserIcon, LogOutIcon } from "./icons";

function TopBar({ csrf }: { csrf: string }) {
  return (
    <header className="topbar">
      <div className="shell inner">
        <Link href="/" aria-label="יבול בשפע · דף הבית">
          <BrandLockup size="sm" showName={false} />
        </Link>
        <div className="nav-actions">
          <Link href="/account" className="nav-icon" aria-label="החשבון שלי" title="החשבון שלי">
            <UserIcon size={20} />
          </Link>
          <Link href="/notifications" className="nav-icon" aria-label="התראות" title="התראות">
            <BellIcon size={20} />
          </Link>
          <LogoutButton csrf={csrf} iconOnly />
        </div>
      </div>
    </header>
  );
}

function Sidebar({ user, csrf }: { user: SessionUser; csrf: string }) {
  return (
    <aside className="sidebar" aria-label="ניווט ראשי">
      <Link href="/" className="sidebar-brand" aria-label="יבול בשפע · דף הבית">
        <BrandLockup size="md" />
      </Link>
      <SidebarNavLinks role={user.role} />
      <div className="sidebar-footer">
        <Link href="/notifications" className="sidebar-nav-link">
          <BellIcon size={22} />
          <span>התראות</span>
        </Link>
        <Link href="/account" className="sidebar-nav-link">
          <UserIcon size={22} />
          <span>{user.name.trim().split(/\s+/)[0]}</span>
        </Link>
        <LogoutButton csrf={csrf} />
      </div>
    </aside>
  );
}

function LogoutButton({ csrf, iconOnly }: { csrf: string; iconOnly?: boolean }) {
  return (
    <form action="/api/logout" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      {iconOnly ? (
        <button className="icon-btn" type="submit" aria-label="התנתקות" title="התנתקות">
          <LogOutIcon size={20} />
        </button>
      ) : (
        <button className="sidebar-nav-link" type="submit">
          <LogOutIcon size={22} />
          <span>התנתקות</span>
        </button>
      )}
    </form>
  );
}

export async function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const csrf = await csrfValue();
  return (
    <div className="app-shell">
      <TopBar csrf={csrf} />
      <div className="app-body">
        <Sidebar user={user} csrf={csrf} />
        <div className="content-area">
          <main className="shell main">{children}</main>
          <footer className="footer">יבול בשפע</footer>
        </div>
      </div>
      <BottomNavLinks role={user.role} />
    </div>
  );
}
