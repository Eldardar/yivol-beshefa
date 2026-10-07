// תמונות פרופיל — משותף לדפדפן ולשרת
// avatarVersion: null כשאין תמונה; משתנה בכל החלפה
export type AvatarRef = { userId: number; name: string; avatarVersion?: string | null };

export const AVATAR_SIZE = 512;

export function avatarUrl(userId: number, version: string): string {
  return `/api/users/${userId}/avatar?v=${encodeURIComponent(version)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
