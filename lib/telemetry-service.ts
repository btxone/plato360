import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { candidateCampaigns, orders, products, telemetryEvents } from "@/db/schema";
import { isFeatureEnabled } from "@/lib/features";
import { getCurrentPublicSession, PublicSessionRequiredError } from "@/lib/public-session";

export const telemetryEventTypes = ["impression", "detail_open", "add_to_cart", "order_created", "vote", "interest"] as const;
export type TelemetryEventType = (typeof telemetryEventTypes)[number];

export class TelemetryFeatureDisabledError extends Error {
  constructor() {
    super("La telemetría está desactivada para este local.");
    this.name = "TelemetryFeatureDisabledError";
  }
}

export class TelemetryReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelemetryReferenceError";
  }
}

export async function requireTelemetrySession() {
  const session = await getCurrentPublicSession();
  if (!session) throw new PublicSessionRequiredError();
  if (!(await isFeatureEnabled(session.locationId, "telemetry"))) throw new TelemetryFeatureDisabledError();
  return session;
}

export async function recordTelemetry(session: Awaited<ReturnType<typeof requireTelemetrySession>>, events: Array<{
  eventType: TelemetryEventType;
  idempotencyKey: string;
  occurredAt?: Date;
  productSlug?: string;
  candidateSlug?: string;
  orderId?: string;
  payload?: Record<string, unknown>;
}>) {
  const db = getDb();
  const productSlugs = [...new Set(events.flatMap((event) => event.productSlug ? [event.productSlug] : []))];
  const candidateSlugs = [...new Set(events.flatMap((event) => event.candidateSlug ? [event.candidateSlug] : []))];
  const productRows = productSlugs.length === 0 ? [] : await db.select({ id: products.id, slug: products.slug }).from(products).where(and(eq(products.locationId, session.locationId), eq(products.status, "published"), inArray(products.slug, productSlugs)));
  const candidateRows = candidateSlugs.length === 0 ? [] : await db.select({ id: candidateCampaigns.id, slug: candidateCampaigns.slug }).from(candidateCampaigns).where(and(eq(candidateCampaigns.locationId, session.locationId), eq(candidateCampaigns.status, "published"), inArray(candidateCampaigns.slug, candidateSlugs)));
  const productBySlug = new Map(productRows.map((product) => [product.slug, product.id]));
  const candidateBySlug = new Map(candidateRows.map((candidate) => [candidate.slug, candidate.id]));
  for (const slug of productSlugs) if (!productBySlug.has(slug)) throw new TelemetryReferenceError(`El producto ${slug} no está disponible para telemetría.`);
  for (const slug of candidateSlugs) if (!candidateBySlug.has(slug)) throw new TelemetryReferenceError(`El candidato ${slug} no está disponible para telemetría.`);
  const orderIds = [...new Set(events.flatMap((event) => event.orderId ? [event.orderId] : []))];
  if (orderIds.length > 0) {
    const ownedOrders = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.locationId, session.locationId), eq(orders.dinerSessionId, session.id), inArray(orders.id, orderIds)));
    const ownedOrderIds = new Set(ownedOrders.map((order) => order.id));
    for (const orderId of orderIds) if (!ownedOrderIds.has(orderId)) throw new TelemetryReferenceError("El pedido no pertenece a la sesión actual.");
  }
  const rows = events.map((event) => ({
    locationId: session.locationId,
    anonymousId: session.anonymousId,
    dinerSessionId: session.id,
    productId: event.productSlug ? productBySlug.get(event.productSlug) ?? null : null,
    candidateId: event.candidateSlug ? candidateBySlug.get(event.candidateSlug) ?? null : null,
    orderId: event.orderId ?? null,
    eventType: event.eventType,
    idempotencyKey: createHash("sha256").update(`${session.id}:${event.idempotencyKey}`).digest("hex"),
    occurredAt: event.occurredAt ?? new Date(),
    payload: event.payload ?? {},
  }));
  const inserted = await db.insert(telemetryEvents).values(rows).onConflictDoNothing().returning({ id: telemetryEvents.id });
  return { accepted: inserted.length, duplicates: events.length - inserted.length };
}
