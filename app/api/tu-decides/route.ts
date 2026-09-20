import { asc, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonArray } from "@/db/serializers";
import { candidates } from "@/db/schema";

const restaurantId = "casa-brasa";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.restaurantId, restaurantId), eq(candidates.active, 1)))
      .orderBy(asc(candidates.sortOrder));

    return NextResponse.json({
      candidates: rows.map((candidate) => ({
        id: candidate.id,
        slug: candidate.slug,
        name: candidate.name,
        description: candidate.description,
        estimatedPrice: candidate.estimatedPrice,
        wouldOrderPct: candidate.wouldOrderPct,
        votes: candidate.seedVotes,
        notifyCount: candidate.seedNotifyCount,
        avgAttention: Number(candidate.avgAttention),
        video: candidate.videoUrl,
        poster: candidate.posterUrl,
        emoji: candidate.emoji,
        accent: candidate.accent,
        status: candidate.status,
        ingredients: parseJsonArray(candidate.ingredientsJson),
      })),
    });
  } catch (error) {
    console.error("[api/tu-decides] failed to load candidates", error);
    return NextResponse.json({ error: "Tu decides unavailable" }, { status: 503 });
  }
}

