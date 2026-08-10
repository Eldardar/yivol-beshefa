import webpush from "web-push";
import type Database from "better-sqlite3";

type PushItem = { userId: number; title: string; body: string; url?: string };

let configured: boolean | undefined;
function ensureConfigured(): boolean {
  if (configured !== undefined) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (configured) webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:no-reply@example.com", VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  return configured;
}

export function vapidPublicKey(): string | undefined {
  return ensureConfigured() ? process.env.VAPID_PUBLIC_KEY : undefined;
}

export async function pushToUsers(db: Database.Database, items: PushItem[]): Promise<void> {
  if (!ensureConfigured() || items.length === 0) return;
  const subscriptionsFor = db.prepare("SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?");
  const remove = db.prepare("DELETE FROM push_subscriptions WHERE id=?");
  await Promise.allSettled(items.flatMap(item => {
    const subs = subscriptionsFor.all(item.userId) as Array<{ id: number; endpoint: string; p256dh: string; auth: string }>;
    const payload = JSON.stringify({ title: item.title, body: item.body, url: item.url ?? "/notifications" });
    return subs.map(async sub => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) remove.run(sub.id);
        else console.error("שגיאה בשליחת התראת דחיפה", error);
      }
    });
  }));
}
