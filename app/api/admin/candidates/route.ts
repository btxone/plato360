import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { candidateCampaigns, candidateInterests, candidateMedia, candidateVotes, categories, locations, mediaAssets } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationIds } from "@/lib/authorization";
import { assertCatalogManager, promoteDueCandidates } from "@/lib/catalog-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    assertCatalogManager(actor);
    const locationIds = await resolveLocationIds(actor, new URL(request.url).searchParams.get("locationId") ?? undefined);
    if (locationIds.length === 0) return NextResponse.json({ candidates: [] });
    await promoteDueCandidates(locationIds, actor);

    const db = getDb();
    const rows = await db.select({
      candidate: candidateCampaigns,
      locationName: locations.name,
      categoryName: categories.name,
    }).from(candidateCampaigns)
      .innerJoin(locations, eq(candidateCampaigns.locationId, locations.id))
      .leftJoin(categories, eq(candidateCampaigns.categoryId, categories.id))
      .where(and(inArray(candidateCampaigns.locationId, locationIds), isNull(candidateCampaigns.promotedProductId)))
      .orderBy(asc(locations.name), asc(candidateCampaigns.createdAt));
    const candidateIds = rows.map(({ candidate }) => candidate.id);
    const mediaRows = candidateIds.length === 0 ? [] : await db.select({
      candidateId: candidateMedia.candidateId,
      storageKey: mediaAssets.storageKey,
      kind: mediaAssets.kind,
      sortOrder: candidateMedia.sortOrder,
    }).from(candidateMedia)
      .innerJoin(mediaAssets, eq(candidateMedia.mediaId, mediaAssets.id))
      .where(inArray(candidateMedia.candidateId, candidateIds))
      .orderBy(asc(candidateMedia.sortOrder));
    const voteRows = candidateIds.length === 0 ? [] : await db.select({ candidateId: candidateVotes.candidateId, count: sql<number>`count(*)::int` }).from(candidateVotes).where(inArray(candidateVotes.candidateId, candidateIds)).groupBy(candidateVotes.candidateId);
    const interestRows = candidateIds.length === 0 ? [] : await db.select({ candidateId: candidateInterests.candidateId, count: sql<number>`count(*)::int` }).from(candidateInterests).where(inArray(candidateInterests.candidateId, candidateIds)).groupBy(candidateInterests.candidateId);
    const mediaByCandidate = new Map<string, typeof mediaRows>();
    for (const row of mediaRows) mediaByCandidate.set(row.candidateId, [...(mediaByCandidate.get(row.candidateId) ?? []), row]);
    const votesByCandidate = new Map(voteRows.map((row) => [row.candidateId, Number(row.count)]));
    const interestsByCandidate = new Map(interestRows.map((row) => [row.candidateId, Number(row.count)]));

    return NextResponse.json({ candidates: rows.map(({ candidate, locationName, categoryName }) => {
      const media = mediaByCandidate.get(candidate.id) ?? [];
      const images = media.filter((item) => item.kind === "image");
      return {
        id: candidate.id,
        locationId: candidate.locationId,
        locationName,
        categoryId: candidate.categoryId,
        categoryName: categoryName ?? null,
        slug: candidate.slug,
        name: candidate.name,
        description: candidate.description,
        emoji: candidate.emoji,
        accent: candidate.accent,
        finalPriceCents: candidate.finalPriceCents,
        status: candidate.status,
        publishedAt: candidate.publishedAt,
        retiredAt: candidate.retiredAt,
        votes: votesByCandidate.get(candidate.id) ?? 0,
        interests: interestsByCandidate.get(candidate.id) ?? 0,
        media: {
          imageKey: images[0]?.storageKey ?? null,
          posterKey: images[1]?.storageKey ?? null,
          videoKey: media.find((item) => item.kind === "video")?.storageKey ?? null,
        },
      };
    }) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudieron cargar los productos de Tu decides." }, { status: 500 });
  }
}
