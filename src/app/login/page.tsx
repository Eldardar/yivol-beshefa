import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";
import { AuthShell } from "@/components/auth-shell";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string; reset?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");
  const { error, changed, reset } = await searchParams;

  return (
    <AuthShell>
      <div className="stack">
        {error && <p className="alert" role="alert">פרטי ההתחברות שגויים</p>}
        {changed && <p className="alert" role="status">הסיסמה עודכנה בהצלחה. יש להתחבר עם הסיסמה החדשה.</p>}
        {reset && <p className="alert" role="status">הסיסמה אופסה בהצלחה. יש להתחבר עם הסיסמה החדשה.</p>}
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
