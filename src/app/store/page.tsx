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
      <h1>חנות</h1>
      {user.role !== "ADMIN" && <p className="alert" role="status">בקרוב! החנות תיפתח לרכישה בקרוב</p>}
      <StoreGrid products={products} csrf={csrf} canManage={user.role === "ADMIN"} />
    </AppShell>
  );
}
