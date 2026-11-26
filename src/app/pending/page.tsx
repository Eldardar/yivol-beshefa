import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { csrfValue, currentUser, db, pendingUser } from "@/lib/server";
import { SignupService } from "@/lib/services/signup";

export const dynamic = "force-dynamic";

type Params = { verified?: string; resent?: string; error?: string };

export default async function Pending({ searchParams }: { searchParams: Promise<Params> }) {
  const { verified, resent, error } = await searchParams;
  if (await currentUser()) redirect("/");
  const pending = await pendingUser();
  // נפתח מקישור האימות במכשיר שאינו מחובר
  if (!pending) redirect(verified ? "/login?verified=1" : error ? `/login?verifyError=${encodeURIComponent(error)}` : "/login");
  const status = new SignupService(db()).pendingStatus(pending.id);
  if (!status) redirect("/login");
  const csrf = await csrfValue();

  return (
    <AuthShell>
      <div className="stack">
        <h1>החשבון ממתין להפעלה</h1>
        <p>שלום {status.name}, ההרשמה נקלטה. כדי להתחיל לעבוד במערכת צריך להשלים שני שלבים:</p>
        {verified && <p className="alert" role="status">כתובת הדוא״ל אומתה בהצלחה.</p>}
        {resent && <p className="alert" role="status">שלחנו קישור אימות חדש לכתובת {status.email}.</p>}
        {error && <p className="alert" role="alert">{error}</p>}
        <ol className="signup-steps">
          <li className={status.emailVerified ? "is-done" : undefined}>
            <div className="signup-step-head">
              <strong>אימות כתובת הדוא״ל</strong>
              <span className={`tag ${status.emailVerified ? "" : "warn"}`}>{status.emailVerified ? "הושלם" : "ממתין"}</span>
            </div>
            {!status.emailVerified && (
              <>
                <p className="muted">שלחנו קישור אימות אל <span dir="ltr">{status.email}</span>. כדאי לבדוק גם בתיקיית הספאם.</p>
                <form action="/api/signup/resend" method="post">
                  <input type="hidden" name="csrf" value={csrf} />
                  <button className="btn secondary btn-sm" type="submit">שליחת הקישור מחדש</button>
                </form>
              </>
            )}
          </li>
          <li className={status.approved ? "is-done" : undefined}>
            <div className="signup-step-head">
              <strong>אישור מנהל</strong>
              <span className={`tag ${status.approved ? "" : "warn"}`}>{status.approved ? "הושלם" : "ממתין"}</span>
            </div>
            {!status.approved && <p className="muted">המנהל קיבל התראה על ההרשמה שלך. נעדכן אותך בדוא״ל כשהחשבון יאושר.</p>}
          </li>
        </ol>
        <div className="actions">
          <a className="btn secondary" href="/pending">רענון סטטוס</a>
          <form action="/api/logout" method="post">
            <input type="hidden" name="csrf" value={csrf} />
            <button className="btn secondary" type="submit">התנתקות</button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
