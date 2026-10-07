import { avatarUrl, initials } from "@/lib/avatars";

// תמונת הפרופיל של המשתמש, או ראשי התיבות של שמו כשאין תמונה
export function UserAvatar({ userId, name, avatarVersion, size = "md", className = "" }: { userId: number; name: string; avatarVersion?: string | null; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={`avatar avatar-${size}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {avatarVersion
        ? // eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית מאחורי הרשאה, לא מתאימה לאופטימיזציית next/image
          <img src={avatarUrl(userId, avatarVersion)} alt="" loading="lazy" decoding="async" />
        : initials(name)}
    </span>
  );
}
