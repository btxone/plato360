import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { candidateCampaigns, candidateMedia, candidateVotes, locations, mediaAssets, products, telemetryEvents } from "@/db/schema";
import { AuthenticationRequiredError, PermissionDeniedError, requireSession, resolveLocationIds } from "@/lib/authorization";

export const runtime = "nodejs";

const rangeSchema = z.coerce.number().int().min(1).max(90).default(30);

const eventCount = (eventType: string) => sql<number>`count(*) filter (where ${telemetryEvents.eventType} = ${eventType})::int`;

export async function GET(request: Request) {
  try {
    const actor = await requireSession();
    if (actor.role !== "superadmin" && actor.role !== "admin") throw new PermissionDeniedError();
    const search = new URL(request.url).searchParams;
    const parsedRange = rangeSchema.safeParse(search.get("range") ?? "30");
    if (!parsedRange.success) return NextResponse.json({ error: "Rango de telemetría inválido." }, { status: 400 });

    const locationIds = await resolveLocationIds(actor, search.get("locationId") ?? undefined);
    if (locationIds.length === 0) return NextResponse.json({ rangeDays: parsedRange.data, summary: {}, daily: [], products: [], candidates: [], monthly: { mostVoted: null, mostViewed: null } });
    const to = new Date();
    const from = new Date(to.getTime() - parsedRange.data * 24 * 60 * 60 * 1000);
    const monthFrom = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    const conditions = [inArray(telemetryEvents.locationId, locationIds), gte(telemetryEvents.occurredAt, from), lt(telemetryEvents.occurredAt, to)];
    const db = getDb();

    const [summary] = await db.select({
      totalEvents: sql<number>`count(*)::int`,
      uniqueVisitors: sql<number>`count(distinct ${telemetryEvents.anonymousId})::int`,
      impressions: eventCount("impression"),
      detailOpens: eventCount("detail_open"),
      addsToCart: eventCount("add_to_cart"),
      ordersCreated: eventCount("order_created"),
      votes: eventCount("vote"),
      interests: eventCount("interest"),
    }).from(telemetryEvents).where(and(...conditions));

    const dayExpression = sql<string>`to_char(date_trunc('day', ${telemetryEvents.occurredAt}), 'YYYY-MM-DD')`;
    const daily = await db.select({
      day: dayExpression,
      events: sql<number>`count(*)::int`,
      impressions: eventCount("impression"),
      detailOpens: eventCount("detail_open"),
      addsToCart: eventCount("add_to_cart"),
      ordersCreated: eventCount("order_created"),
    }).from(telemetryEvents).where(and(...conditions)).groupBy(dayExpression).orderBy(asc(dayExpression));

    const productRows = await db.select({
      id: telemetryEvents.productId,
      name: products.name,
      impressions: eventCount("impression"),
      detailOpens: eventCount("detail_open"),
      addsToCart: eventCount("add_to_cart"),
      ordersCreated: eventCount("order_created"),
    }).from(telemetryEvents).leftJoin(products, eq(telemetryEvents.productId, products.id)).where(and(...conditions, isNotNull(telemetryEvents.productId))).groupBy(telemetryEvents.productId, products.name).orderBy(desc(sql`count(*)`)).limit(12);

    const candidateRows = await db.select({
      id: telemetryEvents.candidateId,
      name: candidateCampaigns.name,
      impressions: eventCount("impression"),
      detailOpens: eventCount("detail_open"),
      votes: eventCount("vote"),
      interests: eventCount("interest"),
    }).from(telemetryEvents).leftJoin(candidateCampaigns, eq(telemetryEvents.candidateId, candidateCampaigns.id)).where(and(...conditions, isNotNull(telemetryEvents.candidateId))).groupBy(telemetryEvents.candidateId, candidateCampaigns.name).orderBy(desc(sql`count(*)`)).limit(12);

    const [mostVoted] = await db.select({
      id: candidateCampaigns.id,
      name: candidateCampaigns.name,
      locationName: locations.name,
      votes: sql<number>`count(${candidateVotes.id})::int`,
    }).from(candidateCampaigns)
      .innerJoin(locations, eq(candidateCampaigns.locationId, locations.id))
      .leftJoin(candidateVotes, and(eq(candidateVotes.candidateId, candidateCampaigns.id), gte(candidateVotes.createdAt, monthFrom), lt(candidateVotes.createdAt, to)))
      .where(and(eq(candidateCampaigns.status, "published"), inArray(candidateCampaigns.locationId, locationIds)))
      .groupBy(candidateCampaigns.id, candidateCampaigns.name, locations.name)
      .orderBy(desc(sql`count(${candidateVotes.id})`))
      .limit(1);

    const [mostViewed] = await db.select({
      id: candidateCampaigns.id,
      name: candidateCampaigns.name,
      locationName: locations.name,
      views: sql<number>`count(*)::int`,
      totalWatchSeconds: sql<number>`coalesce(sum(case when (${telemetryEvents.payload}->>'durationSeconds') ~ '^[0-9]+$' then ((${telemetryEvents.payload}->>'durationSeconds')::int) else 0 end), 0)::int`,
      averageWatchSeconds: sql<number>`coalesce(avg(case when (${telemetryEvents.payload}->>'durationSeconds') ~ '^[0-9]+$' then ((${telemetryEvents.payload}->>'durationSeconds')::int) else null end), 0)::numeric(10,1)`,
    }).from(telemetryEvents)
      .innerJoin(candidateCampaigns, eq(telemetryEvents.candidateId, candidateCampaigns.id))
      .innerJoin(locations, eq(candidateCampaigns.locationId, locations.id))
      .where(and(eq(telemetryEvents.eventType, "detail_open"), gte(telemetryEvents.occurredAt, monthFrom), lt(telemetryEvents.occurredAt, to), inArray(candidateCampaigns.locationId, locationIds)))
      .groupBy(candidateCampaigns.id, candidateCampaigns.name, locations.name)
      .orderBy(desc(sql`count(*)`), desc(sql`coalesce(sum(case when (${telemetryEvents.payload}->>'durationSeconds') ~ '^[0-9]+$' then ((${telemetryEvents.payload}->>'durationSeconds')::int) else 0 end), 0)`))
      .limit(1);

    const monthlyCandidateIds = [...new Set([mostVoted?.id, mostViewed?.id].filter((id): id is string => Boolean(id)))];
    const monthlyMedia = monthlyCandidateIds.length === 0 ? [] : await db.select({
      candidateId: candidateMedia.candidateId,
      storageKey: mediaAssets.storageKey,
      kind: mediaAssets.kind,
      sortOrder: candidateMedia.sortOrder,
      isPrimary: candidateMedia.isPrimary,
    }).from(candidateMedia).innerJoin(mediaAssets, eq(candidateMedia.mediaId, mediaAssets.id)).where(inArray(candidateMedia.candidateId, monthlyCandidateIds)).orderBy(asc(candidateMedia.sortOrder));
    const mediaByCandidate = new Map<string, typeof monthlyMedia>();
    for (const media of monthlyMedia) mediaByCandidate.set(media.candidateId, [...(mediaByCandidate.get(media.candidateId) ?? []), media]);
    const monthlyMediaFor = (candidateId: string | undefined) => {
      const media = candidateId ? [...(mediaByCandidate.get(candidateId) ?? [])].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder) : [];
      const selected = media[0];
      return selected ? { url: `/${selected.storageKey.replace(/^\//, "")}`, kind: selected.kind } : null;
    };

    const response = NextResponse.json({
      rangeDays: parsedRange.data,
      from,
      to,
      locationIds,
      summary: summary ?? { totalEvents: 0, uniqueVisitors: 0, impressions: 0, detailOpens: 0, addsToCart: 0, ordersCreated: 0, votes: 0, interests: 0 },
      daily,
      products: productRows,
      candidates: candidateRows,
      monthly: {
        month: `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, "0")}`,
        mostVoted: mostVoted ? { ...mostVoted, media: monthlyMediaFor(mostVoted.id) } : null,
        mostViewed: mostViewed ? { ...mostViewed, media: monthlyMediaFor(mostViewed.id) } : null,
      },
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "No se pudo consultar la telemetría." }, { status: 500 });
  }
}
