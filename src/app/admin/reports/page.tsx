import { AppShell } from "@/components/nav";
import { requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Reports() {
  const user = await requireAdmin();

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <section className="card empty-state" style={{ justifyItems: "center", textAlign: "center" }}>
        <img
          src="/reports-placeholder.jpg"
          alt=""
          style={{ maxWidth: "100%", width: 240, borderRadius: "var(--radius-md)" }}
        />
      </section>
    </AppShell>
  );
}
