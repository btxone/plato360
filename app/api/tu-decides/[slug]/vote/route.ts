import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { candidates, votes } from "@/db/schema";

const restaurantId = "casa-brasa";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null) as { voterToken?: unknown } | null;
  const voterToken = typeof body?.voterToken === "string" ? body.voterToken.trim() : "";

  if (voterToken.length < 12 || voterToken.length > 128) {
    return NextResponse.json({ error: "Invalid voter token" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [candidate] = await db
      .select({ id: candidates.id, seedVotes: candidates.seedVotes })
      .from(candidates)
      .where(and(eq(candidates.restaurantId, restaurantId), eq(candidates.slug, slug), eq(candidates.active, 1)))
      .limit(1);

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const [existingVote] = await db
      .select({ id: votes.id })
      .from(votes)
      .where(and(eq(votes.candidateId, candidate.id), eq(votes.voterToken, voterToken)))
      .limit(1);

    if (!existingVote) {
      await db.insert(votes).values({ candidateId: candidate.id, voterToken });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.candidateId, candidate.id));

    return NextResponse.json({
      ok: true,
      alreadyVoted: Boolean(existingVote),
      votes: candidate.seedVotes + Number(count ?? 0),
    }, { status: existingVote ? 200 : 201 });
  } catch (error) {
    console.error("[api/tu-decides/vote] failed to register vote", error);
    return NextResponse.json({ error: "Vote unavailable" }, { status: 503 });
  }
}

