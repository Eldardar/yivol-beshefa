import { redirect } from "next/navigation";
import { csrfValue, currentUser } from "@/lib/server";
import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function ChangePassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/");
  const csrf = await csrfValue();
  const { error } = await searchParams;

  return (
    <AuthShell>
      <div className="stack">
        <h1>החלפת סיסמה זמנית</h1>
        <p>לפני המשך השימוש יש לבחור סיסמה אישית חזקה.</p>
        {error && <p className="alert" role="alert">{error}</p>}
        <form action="/api/change-password" method="post" className="stack">
          <input type="hidden" name="csrf" value={csrf} />
          <div className="field">
            <label htmlFor="password">סיסמה חדשה</label>
            <input className="input" id="password" type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <div className="field">
            <label htmlFor="confirmation">אימות סיסמה</label>
            <input className="input" id="confirmation" type="password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <p className="muted">לפחות 8 תווים, כולל אות גדולה, אות קטנה, ספרה ותו מיוחד.</p>
          <button className="btn">שמירה וכניסה מחדש</button>
        </form>
      </div>
    </AuthShell>
  );
}
