import Link from "next/link";
import { AppShell } from "@/components/nav";
import { OnboardingChecklist } from "@/components/onboarding";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import { PickerService } from "@/lib/services/picker";
import { CalendarIcon, ClipboardListIcon, HistoryIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const database = db();
  const today = jerusalemDate();
  const firstName = user.name.trim().split(/\s+/)[0];

  if (user.role === "ADMIN") {
    const stats = {
      pickers: (database.prepare("SELECT count(*) n FROM users WHERE role='PICKER' AND active=1").get() as { n: number }).n,
      shifts: (database.prepare("SELECT count(*) n FROM shifts WHERE status='PUBLISHED' AND date>=?").get(today) as { n: number }).n,
      farms: (database.prepare("SELECT count(*) n FROM farms WHERE active=1").get() as { n: number }).n,
    };
    return (
      <AppShell user={user}>
        <section className="hero">
          <h1>שלום {firstName}</h1>
          <p>תמונת מצב תפעולית עדכנית</p>
        </section>
        <div className="kpi-grid">
          <article className="kpi-card">
            <span className="kpi-label">קוטפים פעילים</span>
            <div className="metric">{stats.pickers}</div>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">משמרות קרובות</span>
            <div className="metric">{stats.shifts}</div>
          </article>
          <article className="kpi-card">
            <span className="kpi-label">חקלאים פעילים</span>
            <div className="metric">{stats.farms}</div>
          </article>
        </div>
        <Link className="card" href="/admin/shifts">
          <h2>ניהול משמרות ←</h2>
          <p className="muted">יצירה, פרסום ודיווח כמויות</p>
        </Link>
      </AppShell>
    );
  }

  const next = database
    .prepare(
      `SELECT s.id,s.date,s.slot,f.name farm,pf.fruit_type FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       WHERE sp.user_id=? AND s.status='PUBLISHED' AND s.date>=? ORDER BY s.date LIMIT 1`
    )
    .get(user.id, today) as { id: number; date: string; slot: string; farm: string; fruit_type: string } | undefined;

  const personalDetails = new PickerService(database).personalDetails(user.id);
  const profileComplete = Boolean(personalDetails?.dateOfBirth) && Boolean(personalDetails?.favoriteFruit?.trim());
  const pushEnabled = (database.prepare("SELECT count(*) n FROM push_subscriptions WHERE user_id=?").get(user.id) as { n: number }).n > 0;
  const hasAvailability = (database.prepare("SELECT count(*) n FROM availability WHERE user_id=?").get(user.id) as { n: number }).n > 0;
  const onboardingSteps = [
    { key: "profile", title: "מילוי פרטים אישיים", description: "השלימו תאריך לידה ופרי אהוב בעמוד החשבון שלכם", href: "/account", done: profileComplete },
    { key: "push", title: "הפעלת התראות דחיפה", description: "קבלו התראה במכשיר בכל פעם שאתם משובצים למשמרת", href: "/notifications", done: pushEnabled },
    { key: "availability", title: "עדכון זמינות", description: "דווחו זמינות ליום אחד לפחות מתוך 60 הימים הקרובים", href: "/availability", done: hasAvailability },
  ];

  return (
    <AppShell user={user}>
      <section className="hero">
        <h1>שלום {firstName}</h1>
        <p>{next ? `השיבוץ הבא: ${formatHebrewDate(next.date)} · ${next.slot === "MORNING" ? "בוקר" : "ערב"} · ${next.farm}` : "אין שיבוצים קרובים"}</p>
        <pre className="ascii-banner" dir="ltr" aria-hidden="true">
{`                    XXXXXX
          XXX     XX     XXX        XXXXXXX
XXX      XX      XX        XX     XX      X
  XX   XX       XX          XX    X       X
   XX  X        X            X    X      XX
    XXX               XX     X    X    XXX
      XXX           XXXX     X    XXXXX
      X XXX        X        XX    X
      XX  XX       X        X     XX
       XX  X       XXX    XXX      XX         XXXX
        XXXX         XXXXX          XXXXXXXXXXX   `}
        </pre>
        <span className="sr-only">שפע</span>
      </section>
      <OnboardingChecklist steps={onboardingSteps} />
      <div className="grid">
        <Link className="card" href="/availability">
          <CalendarIcon size={22} className="muted" />
          <h2>עדכון זמינות</h2>
          <p className="muted">דיווח זמינות ל-60 הימים הקרובים</p>
        </Link>
        <Link className="card" href="/assignments">
          <ClipboardListIcon size={22} className="muted" />
          <h2>השיבוצים שלי</h2>
          <p className="muted">פרטי עבודה וניווט</p>
        </Link>
        <Link className="card" href="/history">
          <HistoryIcon size={22} className="muted" />
          <h2>היסטוריה וכמויות</h2>
        </Link>
      </div>
    </AppShell>
  );
}
