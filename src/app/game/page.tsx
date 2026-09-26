import { AppShell } from "@/components/nav";
import { requireUser } from "@/lib/server";
import { PickerSnake } from "@/components/picker-snake";

export const dynamic = "force-dynamic";

// Hidden page — reachable only from the button at the bottom of the worker homepage, not from the nav.
export default async function Game() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1>נחש הקוטפים</h1>
      <PickerSnake />
    </AppShell>
  );
}
