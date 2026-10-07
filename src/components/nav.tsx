import Link from "next/link";
import type { SessionUser } from "@/lib/services/auth";
import { csrfValue, db } from "@/lib/server";
import { PickerService } from "@/lib/services/picker";
import { AvatarService } from "@/lib/services/avatars";
import { UserAvatar } from "./user-avatar";
import { BrandLockup } from "./brand-logo";
import { SidebarNavLinks, BottomNavLinks } from "./nav-links";
import { BellIcon, LogOutIcon } from "./icons";

function TopBar({ user, avatarVersion, csrf, hasUnread, notificationsHref }: { user: SessionUser; avatarVersion: string | null; csrf: string; hasUnread: boolean; notificationsHref: string }) {
  return (
    <header className="topbar">
      <div className="shell inner">
        <Link href="/" aria-label="יבול בשפע · דף הבית">
          <BrandLockup size="sm" showName={false} />
        </Link>
        <div className="nav-actions">
          <Link href="/account" className="nav-icon" aria-label="החשבון שלי" title="החשבון שלי">
            <UserAvatar userId={user.id} name={user.name} avatarVersion={avatarVersion} size="sm" />
          </Link>
          <Link href={notificationsHref} className="nav-icon" aria-label="התראות" title="התראות">
            <BellIcon size={20} />
            {hasUnread && <span className="notif-dot" aria-hidden="true" />}
          </Link>
          <LogoutButton csrf={csrf} iconOnly />
        </div>
      </div>
    </header>
  );
}

function Sidebar({ user, avatarVersion, csrf, hasUnread, notificationsHref }: { user: SessionUser; avatarVersion: string | null; csrf: string; hasUnread: boolean; notificationsHref: string }) {
  return (
    <aside className="sidebar" aria-label="ניווט ראשי">
      <Link href="/" className="sidebar-brand" aria-label="יבול בשפע · דף הבית">
        <BrandLockup size="md" />
      </Link>
      <SidebarNavLinks role={user.role} />
      <div className="sidebar-footer">
        <Link href={notificationsHref} className="sidebar-nav-link">
          <span className="notif-icon-wrap">
            <BellIcon size={22} />
            {hasUnread && <span className="notif-dot" aria-hidden="true" />}
          </span>
          <span>התראות</span>
        </Link>
        <Link href="/account" className="sidebar-nav-link">
          <UserAvatar userId={user.id} name={user.name} avatarVersion={avatarVersion} size="xs" />
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
  const hasUnread = new PickerService(db()).unreadCount(user.id) > 0;
  const avatarVersion = new AvatarService(db()).version(user.id);
  const notificationsHref = user.role === "ADMIN" ? "/admin/notifications" : "/notifications";
  return (
    <div className="app-shell">
      <TopBar user={user} avatarVersion={avatarVersion} csrf={csrf} hasUnread={hasUnread} notificationsHref={notificationsHref} />
      <div className="app-body">
        <Sidebar user={user} avatarVersion={avatarVersion} csrf={csrf} hasUnread={hasUnread} notificationsHref={notificationsHref} />
        <div className="content-area">
          <main className="shell main">{children}</main>
          <footer className="footer">יבול בשפע</footer>
        </div>
      </div>
      <BottomNavLinks role={user.role} />
    </div>
  );
}
