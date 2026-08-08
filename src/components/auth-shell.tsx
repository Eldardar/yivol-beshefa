import { BrandLogo } from "./brand-logo";

export function AuthShell({ children, sideExtra }: { children: React.ReactNode; sideExtra?: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand">
            <BrandLogo size="xl" />
            <div>
              <div className="auth-brand-name">יבול בשפע</div>
              <p className="auth-brand-tag">מערכת ניהול תפעול חקלאי</p>
            </div>
          </div>
          {children}
        </div>
      </div>
      <div className="auth-side" aria-hidden="true">
        <div className="auth-side-content">
          <BrandLogo size="lg" className="auth-side-logo" />
          <h2>עונה טובה מתחילה בתפעול מסודר</h2>
          <p>זמינות, שיבוצים ודיווחי קטיף — במקום אחד לכל הצוות.</p>
          {sideExtra}
        </div>
      </div>
    </div>
  );
}
