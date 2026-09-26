import { AppShell } from "@/components/nav";
import { csrfValue, db, requireUser } from "@/lib/server";
import { PickerSnake } from "@/components/picker-snake";
import { topSnakeScores } from "@/lib/snake-scores";

export const dynamic = "force-dynamic";

// Hidden page — reachable only from the button at the bottom of the worker homepage, not from the nav.
export default async function Game() {
  const user = await requireUser();
  const csrf = await csrfValue();
  return (
    <AppShell user={user}>
      <h1>נחש הקוטפים</h1>
      <PickerSnake initialHighScores={topSnakeScores(db())} userId={user.id} csrf={csrf} />
    </AppShell>
  );
}
