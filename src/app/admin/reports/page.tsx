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
          alt="נראלך?!"
          style={{ maxWidth: "100%", width: 420, borderRadius: "var(--radius-md)" }}
        />
        <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>נראלך?!</p>
      </section>
    </AppShell>
  );
}
