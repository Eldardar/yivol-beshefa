import { AppShell } from "@/components/nav";
import { csrfValue, db, requireUser } from "@/lib/server";
import { allLeaderboards } from "@/lib/game-scores";
import { AdminGameGate } from "@/components/admin-game-gate";
import { GameSwitcher } from "@/components/game-switcher";

export const dynamic = "force-dynamic";

// Hidden page — reachable only from the button at the bottom of the homepage, not from the nav. Admins need a password.
export default async function Game() {
  const user = await requireUser();
  const csrf = await csrfValue();
  const games = <GameSwitcher initialLeaderboards={allLeaderboards(db())} userId={user.id} csrf={csrf} />;
  return (
    <AppShell user={user}>
      <h1>משחקים</h1>
      {user.role === "ADMIN" ? <AdminGameGate>{games}</AdminGameGate> : games}
    </AppShell>
  );
}
