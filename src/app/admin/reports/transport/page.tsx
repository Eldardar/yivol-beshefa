import Image from "next/image";
import { AppShell } from "@/components/nav";
import { requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function TransportReport() {
  const user = await requireAdmin();

  return (
    <AppShell user={user}>
      <h1>דוח תחבורה</h1>
      <section className="card empty-state" style={{ justifyItems: "center", textAlign: "center" }}>
        <Image
          src="/reports-placeholder.jpg"
          alt=""
          width={2316}
          height={3088}
          style={{ maxWidth: "100%", width: 240, height: "auto", borderRadius: "var(--radius-md)" }}
        />
        <p>הדוח בבנייה ויתווסף בקרוב.</p>
      </section>
    </AppShell>
  );
}
