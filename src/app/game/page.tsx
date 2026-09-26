import { AppShell } from "@/components/nav";
import { csrfValue, db, requireUser } from "@/lib/server";
import { PickerSnake } from "@/components/picker-snake";
import { topSnakeScores } from "@/lib/snake-scores";
import { AdminGameGate } from "@/components/admin-game-gate";

export const dynamic = "force-dynamic";

// Hidden page — reachable only from the button at the bottom of the homepage, not from the nav. Admins need a password.
export default async function Game() {
  const user = await requireUser();
  const csrf = await csrfValue();
  const game = <PickerSnake initialHighScores={topSnakeScores(db())} userId={user.id} csrf={csrf} />;
  return (
    <AppShell user={user}>
      <h1>נחש הקוטפים</h1>
      {user.role === "ADMIN" ? <AdminGameGate>{game}</AdminGameGate> : game}
    </AppShell>
  );
}
