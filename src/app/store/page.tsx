import { AppShell } from "@/components/nav";
import { StoreGrid } from "@/components/store-grid";
import { csrfValue, db, requireUser } from "@/lib/server";
import { StoreService } from "@/lib/services/store";

export const dynamic = "force-dynamic";

export default async function Store() {
  const user = await requireUser();
  const csrf = await csrfValue();
  const products = new StoreService(db()).list();
  return (
    <AppShell user={user}>
      <h1>חנות{user.role !== "ADMIN" && <span className="soon-title"> (בקרוב)</span>}</h1>
      {user.role !== "ADMIN" && (
        <>
          <div className="soon-marquee" aria-hidden="true">
            <div className="soon-marquee-track">{"בקרוב ✦ ".repeat(40)}</div>
          </div>
          <p className="alert" role="status">בקרוב! החנות תיפתח לרכישה בקרוב. מתי בקרוב? בקרוב. כמה בקרוב? ממש בקרוב. בקרוב בקרוב בקרוב.</p>
        </>
      )}
      <StoreGrid products={products} csrf={csrf} canManage={user.role === "ADMIN"} />
      {user.role !== "ADMIN" && (
        <p className="soon-footer" aria-hidden="true">בקרוב™ · כל הזכויות שמורות לבקרוב · עוד בקרוב, בקרוב</p>
      )}
    </AppShell>
  );
}
