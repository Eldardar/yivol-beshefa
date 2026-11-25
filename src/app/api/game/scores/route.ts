import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { requestBodyIssue } from "@/lib/http";
import { GAMES, isGameId, recordGameScore, topGameScores } from "@/lib/game-scores";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });

  try {
    const issue = requestBodyIssue(req, 1_024, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    if (!isGameId(body.game)) throw new Error("משחק לא מוכר");
    const game = body.game;
    const score = z.number().int().min(1).max(GAMES[game].maxScore).parse(body.score);
    const id = recordGameScore(database, game, user.id, score);
    return NextResponse.json({ ok: true, id, scores: topGameScores(database, game) }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError ? "ניקוד אינו תקין" : error instanceof Error ? error.message : "השמירה נכשלה";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
