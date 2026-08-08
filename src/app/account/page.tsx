import { AppShell } from "@/components/nav";
import { csrfValue, requireUser } from "@/lib/server";
import { UserIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const csrf = await csrfValue();
  const { error } = await searchParams;

  return (
    <AppShell user={user}>
      <h1>החשבון שלי</h1>
      <section className="card">
        <div className="record-card-head">
          <span className="avatar" aria-hidden="true"><UserIcon size={20} /></span>
          <div className="record-card-body">
            <span className="record-card-name">{user.name}</span>
            <span className="muted">{user.email}</span>
          </div>
        </div>
      </section>
      <section className="card">
        <h2>החלפת סיסמה</h2>
        {error && <p className="alert" role="alert">{error}</p>}
        <form action="/api/account/change-password" method="post" className="stack">
          <input type="hidden" name="csrf" value={csrf} />
          <div className="field">
            <label htmlFor="currentPassword">סיסמה נוכחית</label>
            <input className="input" id="currentPassword" type="password" name="currentPassword" autoComplete="current-password" required maxLength={128} />
          </div>
          <div className="field">
            <label htmlFor="password">סיסמה חדשה</label>
            <input className="input" id="password" type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <div className="field">
            <label htmlFor="confirmation">אימות סיסמה</label>
            <input className="input" id="confirmation" type="password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={128} required />
          </div>
          <p className="muted">לפחות 8 תווים, כולל אות גדולה, אות קטנה, ספרה ותו מיוחד.</p>
          <button className="btn" type="submit">עדכון סיסמה</button>
        </form>
      </section>
    </AppShell>
  );
}
