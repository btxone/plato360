import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { createOpaqueToken, digestToken } from "@/lib/auth";
import { dinerSessions } from "@/db/schema";
import { resolveQrToken } from "@/lib/qr";

export const publicSessionCookieName = "plato360_diner_session";
export const publicSessionTtlSeconds = 12 * 60 * 60;

export async function openPublicSession(qrToken: string, existingRawToken?: string) {
  const qr = await resolveQrToken(qrToken);
  const db = getDb();

  if (existingRawToken) {
    const [existing] = await db.select().from(dinerSessions).where(eq(dinerSessions.tokenDigest, digestToken(existingRawToken))).limit(1);
    if (existing && existing.locationId === qr.locationId && existing.tableLabel === qr.tableLabel) {
      const [updated] = await db.update(dinerSessions).set({ qrCodeId: qr.id, lastSeenAt: new Date(), updatedAt: new Date() }).where(eq(dinerSessions.id, existing.id)).returning();
      return { session: updated, rawToken: existingRawToken, created: false };
    }
  }

  const rawToken = createOpaqueToken();
  const [session] = await db.insert(dinerSessions).values({
    locationId: qr.locationId,
    qrCodeId: qr.id,
    tokenDigest: digestToken(rawToken),
    tableLabel: qr.tableLabel,
    lastSeenAt: new Date(),
  }).returning();
  return { session, rawToken, created: true };
}

export function publicSessionView(session: typeof dinerSessions.$inferSelect) {
  return {
    id: session.id,
    locationId: session.locationId,
    qrCodeId: session.qrCodeId,
    anonymousId: session.anonymousId,
    tableLabel: session.tableLabel,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
  };
}
