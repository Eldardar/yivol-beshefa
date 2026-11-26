import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { PasswordRules } from "@/components/password-rules";
import { currentUser, db, pendingUser } from "@/lib/server";
import { SignupService } from "@/lib/services/signup";

export const dynamic = "force-dynamic";

type Params = { token?: string; error?: string; name?: string; email?: string; phone?: string };

export default async function Signup({ searchParams }: { searchParams: Promise<Params> }) {
  if (await currentUser()) redirect("/");
  if (await pendingUser()) redirect("/pending");
  const { token = "", error, name = "", email = "", phone = "" } = await searchParams;
  const valid = new SignupService(db()).inviteIsValid(token);

  return (
    <AuthShell>
      <div className="stack">
        <h1>הרשמה לעובדים</h1>
        {!valid ? (
          <>
            <p className="alert" role="alert">קישור ההזמנה אינו תקין, כבר נוצל או שפג תוקפו. יש לבקש מהמנהל קישור חדש.</p>
            <p><Link href="/login">למעבר למסך הכניסה</Link></p>
          </>
        ) : (
          <>
            <p className="muted">לאחר ההרשמה נשלח אליך קישור לאימות כתובת הדוא״ל. החשבון ייפתח לשימוש אחרי האימות ואישור המנהל.</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <form action="/api/signup" method="post" className="stack">
              <input type="hidden" name="token" value={token} />
              <div className="field">
                <label htmlFor="name">שם מלא</label>
                <input className="input" id="name" name="name" defaultValue={name} autoComplete="name" required maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="email">דוא״ל</label>
                <input className="input" id="email" name="email" type="email" dir="ltr" defaultValue={email} autoComplete="email" required maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="phone">טלפון</label>
                <input className="input" id="phone" name="phone" type="tel" dir="ltr" defaultValue={phone} autoComplete="tel" required maxLength={30} />
              </div>
              <div className="field">
                <label htmlFor="nationalId">תעודת זהות</label>
                <input className="input" id="nationalId" name="nationalId" dir="ltr" inputMode="numeric" pattern="[0-9]{9}" minLength={9} maxLength={9} autoComplete="off" required />
              </div>
              <PasswordRules />
              <div className="field">
                <label htmlFor="password">סיסמה</label>
                <input className="input" id="password" type="password" name="password" aria-describedby="password-rules" autoComplete="new-password" minLength={8} maxLength={128} required />
              </div>
              <div className="field">
                <label htmlFor="confirmation">אימות סיסמה</label>
                <input className="input" id="confirmation" type="password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={128} required />
              </div>
              <button className="btn" type="submit">יצירת חשבון</button>
            </form>
            <p className="muted">כבר יש לך חשבון? <Link href="/login">כניסה</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
