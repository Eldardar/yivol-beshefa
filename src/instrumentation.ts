const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __yivolReminderTimer?: ReturnType<typeof setInterval> };
  if (g.__yivolReminderTimer) return;

  const { db } = await import("@/lib/server");
  const { sendMissingReportReminders } = await import("@/lib/services/reminders");
  const { sendDueScheduledNotifications } = await import("@/lib/services/scheduled-notifications");

  const run = () => {
    const database = db();
    sendMissingReportReminders(database).catch(error => console.error("שגיאה בבדיקת דיווחים חסרים", error));
    sendDueScheduledNotifications(database).catch(error => console.error("שגיאה בבדיקת הודעות מתוזמנות", error));
  };
  run();
  g.__yivolReminderTimer = setInterval(run, CHECK_INTERVAL_MS);
}
