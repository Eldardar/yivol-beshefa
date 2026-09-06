const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __yivolReminderTimer?: ReturnType<typeof setInterval> };
  if (g.__yivolReminderTimer) return;

  const { db } = await import("@/lib/server");
  const { sendMissingReportReminders } = await import("@/lib/services/reminders");

  const run = () => {
    sendMissingReportReminders(db()).catch(error => console.error("שגיאה בבדיקת דיווחים חסרים", error));
  };
  run();
  g.__yivolReminderTimer = setInterval(run, CHECK_INTERVAL_MS);
}
