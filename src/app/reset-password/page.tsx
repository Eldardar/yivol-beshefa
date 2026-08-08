import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  return (
    <AuthShell>
      <div className="stack">
        <h1>קביעת סיסמה חדשה</h1>
        {error && <p className="alert" role="alert">{error}</p>}
        <form action="/api/reset-password" method="post" className="stack">
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="password">סיסמה חדשה</label>
            <input className="input" id="password" type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <div className="field">
            <label htmlFor="confirmation">אימות סיסמה</label>
            <input className="input" id="confirmation" type="password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <p className="muted">לפחות 8 תווים, כולל אות גדולה, אות קטנה, ספרה ותו מיוחד.</p>
          <button className="btn" type="submit">שמירת סיסמה</button>
        </form>
      </div>
    </AuthShell>
  );
}
