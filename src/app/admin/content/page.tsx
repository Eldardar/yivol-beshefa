import { AppShell } from "@/components/nav";
import { GalleryManager, QuotesManager } from "@/components/site-content-manager";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { SiteContentService } from "@/lib/services/site-content";

export const dynamic = "force-dynamic";

export default async function SiteContent() {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const service = new SiteContentService(db());
  return (
    <AppShell user={user}>
      <h1>תוכן האתר</h1>
      <section className="card stack">
        <h2>גלריית תמונות לעובדים</h2>
        <GalleryManager photos={service.listPhotos()} csrf={csrf} />
      </section>
      <section className="card stack">
        <h2>ציטוטים</h2>
        <QuotesManager quotes={service.listQuotes()} csrf={csrf} />
      </section>
    </AppShell>
  );
}
