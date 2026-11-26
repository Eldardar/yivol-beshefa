import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, db, pendingUser } from "@/lib/server";
import { SiteContentService } from "@/lib/services/site-content";
import { quoteDir } from "@/lib/site-content";
import { AuthShell } from "@/components/auth-shell";
import { QuoteGallery } from "@/components/quote-gallery";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string; reset?: string; verified?: string; activated?: string; registered?: string; verifyError?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");
  if (await pendingUser()) redirect("/pending");
  const { error, changed, reset, verified, activated, registered, verifyError } = await searchParams;

  return (
    <AuthShell
      sideExtra={
        <QuoteGallery quotes={new SiteContentService(db()).listQuotes().map(q => ({ text: q.text, cite: q.cite, dir: quoteDir(q.text) }))} />
      }
    >
      <div className="stack">
        {error && <p className="alert" role="alert">פרטי ההתחברות שגויים</p>}
        {changed && <p className="alert" role="status">הסיסמה עודכנה בהצלחה. יש להתחבר עם הסיסמה החדשה.</p>}
        {reset && <p className="alert" role="status">הסיסמה אופסה בהצלחה. יש להתחבר עם הסיסמה החדשה.</p>}
        {registered && <p className="alert" role="status">ההרשמה נקלטה. שלחנו קישור לאימות כתובת הדוא״ל; יש להתחבר כדי לעקוב אחר סטטוס האישור.</p>}
        {verified && <p className="alert" role="status">כתובת הדוא״ל אומתה. החשבון ייפתח לאחר אישור המנהל.</p>}
        {activated && <p className="alert" role="status">כתובת הדוא״ל אומתה והחשבון פעיל. אפשר להתחבר.</p>}
        {verifyError && <p className="alert" role="alert">{verifyError}</p>}
        <form action="/api/login" method="post" className="stack">
          <div className="field">
            <label htmlFor="email">דוא״ל</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
          </div>
          <div className="field">
            <label htmlFor="password">סיסמה</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} />
          </div>
          <button className="btn" type="submit">כניסה מאובטחת</button>
        </form>
        <p><Link href="/forgot-password">שכחתי סיסמה</Link></p>
      </div>
    </AuthShell>
  );
}
