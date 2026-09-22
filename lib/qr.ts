import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { qrCodes } from "@/db/schema";
import { assertSameLocation, PermissionDeniedError, resolveLocationId } from "@/lib/authorization";
import { digestToken, type CurrentSession } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/features";

export type QrKind = "fixed" | "dynamic";

type QrPayload = {
  v: 1;
  publicId: string;
  locationId: string;
  tableLabel: string;
  exp: number | null;
};

export class InvalidQrError extends Error {
  constructor(message = "El QR no es válido o ya no está disponible.") {
    super(message);
    this.name = "InvalidQrError";
  }
}

export class QrFeatureDisabledError extends Error {
  constructor() {
    super("Esta función QR está desactivada para el local.");
    this.name = "QrFeatureDisabledError";
  }
}

const getSecret = () => {
  const secret = process.env.QR_HMAC_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("QR_HMAC_SECRET debe tener al menos 32 caracteres.");
  return secret;
};

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signatureFor = (encodedPayload: string) => createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");

export function signQrPayload(payload: QrPayload) {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signatureFor(encodedPayload)}`;
}

export function getQrToken(qr: Pick<typeof qrCodes.$inferSelect, "publicId" | "locationId" | "tableLabel" | "expiresAt">) {
  return signQrPayload({
    v: 1,
    publicId: qr.publicId,
    locationId: qr.locationId,
    tableLabel: qr.tableLabel,
    exp: qr.expiresAt ? Math.floor(qr.expiresAt.getTime() / 1000) : null,
  });
}

export function verifyQrToken(token: string): QrPayload {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new InvalidQrError();
  const expected = signatureFor(encodedPayload);
  const receivedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) throw new InvalidQrError();
  try {
    const payload = JSON.parse(decode(encodedPayload)) as QrPayload;
    if (payload.v !== 1 || !payload.publicId || !payload.locationId || !payload.tableLabel) throw new InvalidQrError();
    if (payload.exp !== null && (!Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000))) throw new InvalidQrError("El QR dinámico venció.");
    return payload;
  } catch (error) {
    if (error instanceof InvalidQrError) throw error;
    throw new InvalidQrError();
  }
}

export async function createQrCode(actor: CurrentSession, input: { kind: QrKind; tableLabel: string; durationMinutes?: number; locationId?: string }) {
  const tableLabel = input.tableLabel.trim();
  if (!tableLabel || tableLabel.length > 80) throw new InvalidQrError("La mesa indicada no es válida.");
  if (input.kind === "fixed" && actor.role !== "superadmin") throw new PermissionDeniedError();
  const locationId = await resolveLocationId(actor, input.locationId);
  const featureKey = input.kind === "fixed" ? "fixed_qr" : "dynamic_qr";
  if (!(await isFeatureEnabled(locationId, featureKey))) throw new QrFeatureDisabledError();
  const durationMinutes = input.durationMinutes ?? 120;
  if (input.kind === "dynamic" && (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 24 * 60)) throw new InvalidQrError("La duración debe estar entre 15 minutos y 24 horas.");
  const expiresAt = input.kind === "dynamic" ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;
  const db = getDb();
  return db.transaction(async (tx) => {
    if (input.kind === "dynamic") {
      await tx.update(qrCodes).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(qrCodes.locationId, locationId), eq(qrCodes.kind, "dynamic"), eq(qrCodes.tableLabel, tableLabel), eq(qrCodes.status, "active")));
    }
    const publicId = randomBytes(12).toString("base64url");
    const [created] = await tx.insert(qrCodes).values({ locationId, kind: input.kind, tableLabel, publicId, tokenDigest: "pending", expiresAt, createdByUserId: actor.userId }).returning();
    const token = signQrPayload({ v: 1, publicId, locationId, tableLabel, exp: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null });
    const [updated] = await tx.update(qrCodes).set({ tokenDigest: digestToken(token), updatedAt: new Date() }).where(eq(qrCodes.id, created.id)).returning();
    return { qr: updated, token };
  });
}

export async function resolveQrToken(token: string) {
  const payload = verifyQrToken(token);
  const db = getDb();
  const [qr] = await db.select().from(qrCodes).where(and(eq(qrCodes.publicId, payload.publicId), eq(qrCodes.locationId, payload.locationId))).limit(1);
  if (!qr || qr.status !== "active" || qr.tokenDigest !== digestToken(token)) throw new InvalidQrError();
  if (qr.expiresAt && qr.expiresAt <= new Date()) {
    await db.update(qrCodes).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(eq(qrCodes.id, qr.id));
    throw new InvalidQrError("El QR dinámico venció.");
  }
  await db.update(qrCodes).set({ lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(qrCodes.id, qr.id));
  return qr;
}

export async function assertQrLocation(actor: CurrentSession, locationId: string) {
  if (actor.role !== "superadmin") assertSameLocation(actor, locationId);
}
