import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { createOpaqueToken, digestToken } from "@/lib/auth";
import { dinerSessions, qrCodes } from "@/db/schema";
import { resolveQrToken } from "@/lib/qr";

export const publicSessionCookieName = "plato360_diner_session";
export const publicSessionTtlSeconds = 12 * 60 * 60;

export class PublicSessionRequiredError extends Error {
  constructor() {
    super("Escaneá el código QR de tu mesa para continuar.");
    this.name = "PublicSessionRequiredError";
  }
}

export async function openPublicSession(qrToken: string) {
  const qr = await resolveQrToken(qrToken);
  const db = getDb();

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

export async function getCurrentPublicSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(publicSessionCookieName)?.value;
  if (!rawToken) return null;
  const db = getDb();
  const [row] = await db.select({ session: dinerSessions, qr: qrCodes }).from(dinerSessions).innerJoin(qrCodes, eq(dinerSessions.qrCodeId, qrCodes.id)).where(eq(dinerSessions.tokenDigest, digestToken(rawToken))).limit(1);
  if (!row) { cookieStore.delete(publicSessionCookieName); return null; }
  const qrExpired = row.qr.expiresAt !== null && row.qr.expiresAt <= new Date();
  if (row.qr.status !== "active" || qrExpired) {
    if (row.qr.status === "active" && qrExpired) await db.update(qrCodes).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(eq(qrCodes.id, row.qr.id));
    cookieStore.delete(publicSessionCookieName);
    return null;
  }
  const session = row.session;
  const [updated] = await db.update(dinerSessions).set({ lastSeenAt: new Date(), updatedAt: new Date() }).where(eq(dinerSessions.id, session.id)).returning();
  return updated;
}
